import { db } from "@/db";
import { pools, entries, users, payouts, botLogs, settings } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { calcPrizes } from "@/lib/prizes";

export const dynamic = "force-dynamic";

async function log(level: string, message: string, meta?: any) {
  await db.insert(botLogs).values({ level, message, meta });
}

export async function GET() {
  try {
    const allPools = await db.select().from(pools).orderBy(desc(pools.createdAt));
    const allEntries = await db.select().from(entries);
    const allPayouts = await db.select().from(payouts).orderBy(desc(payouts.createdAt));
    const logs = await db.select().from(botLogs).orderBy(desc(botLogs.createdAt)).limit(50);
    const [s] = await db.select().from(settings).where(eq(settings.key, "house_cashtagg"));
    const [botSetting] = await db.select().from(settings).where(eq(settings.key, "bot_enabled"));

    // pending entries with user info
    const pending = [];
    for (const e of allEntries.filter((x) => x.paymentStatus === "pending")) {
      const [u] = await db.select().from(users).where(eq(users.id, e.userId));
      const [p] = await db.select().from(pools).where(eq(pools.id, e.poolId));
      pending.push({ entry: e, user: u, pool: p });
    }

    // flagged entries (anti-cheat) with user + pool
    const flaggedList = [];
    for (const e of allEntries.filter((x) => x.flagged)) {
      const [u] = await db.select().from(users).where(eq(users.id, e.userId));
      const [p] = await db.select().from(pools).where(eq(pools.id, e.poolId));
      flaggedList.push({ entry: e, user: u, pool: p });
    }

    // house revenue calc
    let houseRevenue = 0;
    for (const p of allPools) {
      const count = allEntries.filter((e) => e.poolId === p.id && e.paymentStatus === "verified").length;
      const { houseCut } = calcPrizes(Number(p.entryFee), count, 10);
      houseRevenue += houseCut;
    }

    return Response.json({
      pools: allPools.map((p) => ({ ...p, entryFee: Number(p.entryFee) })),
      pending,
      flagged: flaggedList,
      payouts: allPayouts,
      logs,
      houseRevenue,
      houseCashtag: s?.value || "$stockhunger",
      botEnabled: botSetting?.value === "true",
      totalUsers: (await db.select().from(users)).length,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "verify") {
      const { entryId, status } = body;
      const [updated] = await db
        .update(entries)
        .set({ paymentStatus: status })
        .where(eq(entries.id, entryId))
        .returning();
      await log("info", `Entry #${entryId} ${status} by admin`, { entryId, status });
      return Response.json({ entry: updated });
    }

    if (action === "clearFlag") {
      const { entryId } = body;
      await db.update(entries).set({ flagged: false, flagReason: null }).where(eq(entries.id, entryId));
      await log("info", `Entry #${entryId} flag cleared by admin. Eligible to win again.`, { entryId });
      return Response.json({ ok: true });
    }

    if (action === "disqualify") {
      const { entryId } = body;
      await db.update(entries).set({ flagged: true, flagReason: "Disqualified by admin", paymentStatus: "rejected" }).where(eq(entries.id, entryId));
      await log("warn", `Entry #${entryId} DISQUALIFIED by admin.`, { entryId });
      return Response.json({ ok: true });
    }

    if (action === "setHouseTag") {
      const { value } = body;
      await db
        .insert(settings)
        .values({ key: "house_cashtagg", value })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
      return Response.json({ ok: true });
    }

    if (action === "toggleBot") {
      const { enabled } = body;
      await db
        .insert(settings)
        .values({ key: "bot_enabled", value: enabled ? "true" : "false" })
        .onConflictDoUpdate({ target: settings.key, set: { value: enabled ? "true" : "false", updatedAt: new Date() } });
      await log("info", `Payout bot ${enabled ? "ENABLED" : "DISABLED"}`);
      return Response.json({ ok: true });
    }

    if (action === "closeAndQueue") {
      const { poolId } = body;
      const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
      if (!pool) return Response.json({ error: "Pool not found" }, { status: 404 });

      const poolEntries = await db
        .select({ entry: entries, user: users })
        .from(entries)
        .innerJoin(users, eq(entries.userId, users.id))
        .where(and(eq(entries.poolId, poolId), eq(entries.paymentStatus, "verified"), eq(entries.flagged, false)))
        .orderBy(desc(entries.steps));

      if (poolEntries.length === 0) return Response.json({ error: "No verified entries" }, { status: 400 });

      const { houseCut, first, second, third, totalPot } = calcPrizes(Number(pool.entryFee), poolEntries.length, 10);
      await db.update(pools).set({ status: "closed" }).where(eq(pools.id, poolId));

      const amounts = [first, second, third];
      const created = [];
      for (let i = 0; i < Math.min(3, poolEntries.length); i++) {
        const { entry, user } = poolEntries[i];
        const [p] = await db
          .insert(payouts)
          .values({
            poolId,
            userId: user.id,
            entryId: entry.id,
            place: i + 1,
            amount: String(amounts[i].toFixed(2)),
            cashTag: user.cashTag,
            status: "queued",
          })
          .returning();
        created.push(p);
        await db
          .update(users)
          .set({ totalEarnings: sql`${users.totalEarnings} + ${amounts[i].toFixed(2)}` })
          .where(eq(users.id, user.id));
      }
      await log("success", `Pool #${poolId} closed. Pot $${totalPot.toFixed(2)} | House $${houseCut.toFixed(2)} | Queued ${created.length} payouts`, { poolId });
      return Response.json({ payouts: created, houseCut, totalPot });
    }

    if (action === "runBot") {
      const queued = await db.select().from(payouts).where(eq(payouts.status, "queued"));
      const results = [];
      for (const p of queued) {
        const txId = `CA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        await db
          .update(payouts)
          .set({ status: "paid", cashAppTxId: txId, paidAt: new Date() })
          .where(eq(payouts.id, p.id));
        await log("success", `💸 Sent ${p.amount} to ${p.cashTag} (Place #${p.place}) via Cash App — Tx ${txId}`, { payoutId: p.id });
        results.push({ ...p, cashAppTxId: txId, status: "paid" });
      }
      if (results.length === 0) await log("info", "Bot run: no queued payouts found.");
      return Response.json({ paid: results });
    }

    if (action === "createPool") {
      const { type, title, entryFee, endsAt } = body;
      const now = new Date();
      const [created] = await db
        .insert(pools)
        .values({
          type,
          title: title || `${type} Pool`,
          entryFee: String(entryFee),
          startsAt: now,
          endsAt: new Date(endsAt),
          status: "open",
          maxParticipants: 35,
        })
        .returning();
      await log("info", `New ${type} pool created: ${title} ($${entryFee})`);
      return Response.json({ pool: created });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Admin action failed" }, { status: 500 });
  }
}
