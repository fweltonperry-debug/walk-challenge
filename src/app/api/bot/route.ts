import { db } from "@/db";
import { pools, entries, users, payouts, botLogs, settings } from "@/db/schema";
import { eq, desc, sql, and, lte } from "drizzle-orm";
import { calcPrizes } from "@/lib/prizes";
import { SYNC_GRACE_MS } from "@/lib/step-rules";

export const dynamic = "force-dynamic";

async function log(level: string, message: string, meta?: any) {
  await db.insert(botLogs).values({ level, message, meta });
}

async function getSetting(key: string, def: string) {
  const [r] = await db.select().from(settings).where(eq(settings.key, key));
  return r?.value ?? def;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

function genTxId() {
  return `CA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function GET() {
  try {
    const botEnabled = (await getSetting("bot_enabled", "true")) === "true";
    const lastRun = await getSetting("bot_last_run", "");
    const houseTag = await getSetting("house_cashtagg", "$stockhunger");

    const queued = await db.select().from(payouts).where(eq(payouts.status, "queued"));
    const paidToday = await db.execute(
      sql`SELECT count(*)::int as c, COALESCE(sum(amount),0)::text as total FROM payouts WHERE status='paid' AND paid_at::date = CURRENT_DATE`
    );
    const paidRow = paidToday.rows[0] as any;

    const logs = await db.select().from(botLogs).orderBy(desc(botLogs.createdAt)).limit(30);
    const openPools = await db.select().from(pools).where(eq(pools.status, "open"));

    // house revenue
    let houseRevenue = 0;
    const allPools = await db.select().from(pools);
    const allEntries = await db.select().from(entries);
    for (const p of allPools) {
      const count = allEntries.filter((e) => e.poolId === p.id && e.paymentStatus === "verified").length;
      houseRevenue += calcPrizes(Number(p.entryFee), count, 10).houseCut;
    }

    return Response.json({
      botEnabled,
      lastRun,
      houseTag,
      queuedCount: queued.length,
      queued,
      paidTodayCount: Number(paidRow?.c ?? 0),
      paidTodayTotal: paidRow?.total ?? "0",
      logs,
      openPools: openPools.map((p) => ({ ...p, entryFee: Number(p.entryFee) })),
      houseRevenue,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Bot status failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "tick") {
      const botEnabled = (await getSetting("bot_enabled", "true")) === "true";
      if (!botEnabled) {
        await log("warn", "🤖 Bot tick skipped — bot is DISABLED. Enable it in Admin.");
        return Response.json({ ok: false, reason: "bot_disabled" });
      }

      await log("info", "🤖 Bot tick started — checking for ended pools...");
      const now = new Date();
      const closeBefore = new Date(now.getTime() - SYNC_GRACE_MS); // give players 30 min to do a final sync

      // 1. Find ended pools still open
      const endedPools = await db
        .select()
        .from(pools)
        .where(and(eq(pools.status, "open"), lte(pools.endsAt, closeBefore)));

      let closedCount = 0;
      let queuedCount = 0;

      for (const pool of endedPools) {
        const poolEntries = await db
          .select({ entry: entries, user: users })
          .from(entries)
          .innerJoin(users, eq(entries.userId, users.id))
          .where(and(eq(entries.poolId, pool.id), eq(entries.paymentStatus, "verified"), eq(entries.flagged, false)))
          .orderBy(desc(entries.steps));

        if (poolEntries.length === 0) {
          await db.update(pools).set({ status: "closed" }).where(eq(pools.id, pool.id));
          await log("warn", `Pool #${pool.id} (${pool.title}) ended with 0 verified entries — closed, no payouts.`);
          closedCount++;
          continue;
        }

        const { houseCut, first, second, third, totalPot } = calcPrizes(Number(pool.entryFee), poolEntries.length, 10);
        const amounts = [first, second, third];

        await db.update(pools).set({ status: "closed" }).where(eq(pools.id, pool.id));
        await log("info", `🏁 Pool #${pool.id} "${pool.title}" ended. Pot $${totalPot.toFixed(2)} | House $${houseCut.toFixed(2)} | ${poolEntries.length} walkers`, { poolId: pool.id });

        for (let i = 0; i < Math.min(3, poolEntries.length); i++) {
          const { entry, user } = poolEntries[i];
          // avoid duplicate payouts
          const [existing] = await db
            .select()
            .from(payouts)
            .where(and(eq(payouts.poolId, pool.id), eq(payouts.entryId, entry.id)));
          if (existing) continue;

          await db.insert(payouts).values({
            poolId: pool.id,
            userId: user.id,
            entryId: entry.id,
            place: i + 1,
            amount: String(amounts[i].toFixed(2)),
            cashTag: user.cashTag,
            status: "queued",
          });
          await db
            .update(users)
            .set({ totalEarnings: sql`${users.totalEarnings} + ${amounts[i].toFixed(2)}` })
            .where(eq(users.id, user.id));
          await log("info", `  → Queued #${i + 1} ${user.cashTag} $${amounts[i].toFixed(2)}`, { poolId: pool.id, userId: user.id });
          queuedCount++;
        }
        closedCount++;
      }

      // 1b. Auto-renew: open the next pool of the same type
      const DURATION_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
      for (const pool of endedPools) {
        const days = DURATION_DAYS[pool.type];
        if (!days) continue;
        const start = new Date(Math.max(Date.now(), new Date(pool.endsAt).getTime()));
        const [next] = await db
          .insert(pools)
          .values({
            type: pool.type,
            title: pool.title,
            entryFee: pool.entryFee,
            startsAt: start,
            endsAt: new Date(start.getTime() + days * 86400000),
            status: "open",
            maxParticipants: 35,
          })
          .returning();
        await log("info", `🔁 New ${pool.type} pool #${next.id} opened (ends ${next.endsAt.toISOString()})`, { poolId: next.id });
      }

      // 2. Pay all queued payouts via Cash App (simulated API call)
      const queued = await db.select().from(payouts).where(eq(payouts.status, "queued"));
      let paidCount = 0;
      let paidTotal = 0;

      for (const p of queued) {
        const txId = genTxId();
        // Simulate Cash App API latency
        await new Promise((r) => setTimeout(r, 120));
        await db
          .update(payouts)
          .set({ status: "paid", cashAppTxId: txId, paidAt: new Date() })
          .where(eq(payouts.id, p.id));
        await log("success", `💸 PAID $${p.amount} → ${p.cashTag} (Place #${p.place}, Pool #${p.poolId}) via Cash App • Tx ${txId}`, { payoutId: p.id });
        paidCount++;
        paidTotal += Number(p.amount);
      }

      await setSetting("bot_last_run", new Date().toISOString());
      await log("success", `🤖 Bot tick complete: closed ${closedCount} pools, queued ${queuedCount}, paid ${paidCount} winners ($${paidTotal.toFixed(2)})`, { closedCount, queuedCount, paidCount });

      return Response.json({ ok: true, closedCount, queuedCount, paidCount, paidTotal });
    }

    if (action === "payNow") {
      // Pay all queued immediately (manual override)
      const queued = await db.select().from(payouts).where(eq(payouts.status, "queued"));
      let paid = 0;
      for (const p of queued) {
        const txId = genTxId();
        await db.update(payouts).set({ status: "paid", cashAppTxId: txId, paidAt: new Date() }).where(eq(payouts.id, p.id));
        await log("success", `💸 PAID $${p.amount} → ${p.cashTag} via Cash App • Tx ${txId}`);
        paid++;
      }
      return Response.json({ ok: true, paid });
    }

    if (action === "toggle") {
      const { enabled } = body;
      await setSetting("bot_enabled", enabled ? "true" : "false");
      await log(enabled ? "success" : "warn", `🤖 Payout bot ${enabled ? "ENABLED — auto-pay ON" : "DISABLED — auto-pay OFF"}`);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    await log("error", `Bot error: ${(e as Error).message}`);
    return Response.json({ error: "Bot failed" }, { status: 500 });
  }
}
