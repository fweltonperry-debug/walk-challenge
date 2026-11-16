import { db } from "@/db";
import { entries, pools, stepLogs, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { MAX_STEPS_PER_DAY, SYNC_GRACE_MS } from "@/lib/step-rules";

export const dynamic = "force-dynamic";

type DayBucket = { date: string; steps: number };

/**
 * Called by the StepCash Android app. Steps come from Health Connect
 * (phone + connected watch, de-duplicated by Health Connect).
 * Hand-typed ("manual") Health Connect entries are reported separately and NOT counted.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = Number(body.userId);
    const entryId = Number(body.entryId);
    const totalSteps = Math.round(Number(body.totalSteps));
    const manualSteps = Math.max(0, Math.round(Number(body.manualSteps) || 0));
    const days: DayBucket[] = Array.isArray(body.days) ? body.days : [];
    const source = String(body.source || "health_connect").slice(0, 30);

    if (!userId || !entryId || !Number.isFinite(totalSteps) || totalSteps < 0) {
      return Response.json({ error: "Invalid sync data" }, { status: 400 });
    }

    const [entry] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
    if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });
    if (entry.paymentStatus !== "verified") {
      return Response.json({ error: "Payment not verified yet" }, { status: 400 });
    }

    const [pool] = await db.select().from(pools).where(eq(pools.id, entry.poolId));
    if (!pool) return Response.json({ error: "Pool not found" }, { status: 404 });
    if (pool.status !== "open") return Response.json({ error: "Pool is closed" }, { status: 400 });
    if (Date.now() > new Date(pool.endsAt).getTime() + SYNC_GRACE_MS) {
      return Response.json({ error: "Sync window for this pool has ended" }, { status: 400 });
    }

    // Anti-cheat: don't count hand-typed steps
    const countedSteps = Math.max(0, totalSteps - manualSteps);

    // Anti-cheat: flag impossible days
    const reasons: string[] = [];
    const badDays = days.filter((d) => Number(d.steps) > MAX_STEPS_PER_DAY);
    if (badDays.length) {
      reasons.push(
        `Over ${MAX_STEPS_PER_DAY.toLocaleString()} steps on ${badDays.map((d) => `${d.date} (${Math.round(d.steps).toLocaleString()})`).join(", ")}`
      );
    }
    const flagged = entry.flagged || reasons.length > 0;
    const flagReason = reasons.length ? reasons.join("; ") : entry.flagReason;

    const delta = countedSteps - entry.steps;
    const [updated] = await db
      .update(entries)
      .set({
        steps: countedSteps,
        manualStepsBlocked: manualSteps,
        lastSyncAt: new Date(),
        syncSource: source,
        flagged,
        flagReason,
      })
      .where(eq(entries.id, entry.id))
      .returning();

    if (delta !== 0) {
      await db.insert(stepLogs).values({
        entryId: entry.id,
        userId,
        steps: delta,
        source,
        verified: !flagged,
      });
    }

    // Keep the user's lifetime total in sync with their entries
    await db
      .update(users)
      .set({
        totalSteps: sql`(SELECT COALESCE(SUM(steps),0) FROM entries WHERE user_id = ${userId})`,
      })
      .where(eq(users.id, userId));

    return Response.json({ entry: updated, countedSteps, manualStepsBlocked: manualSteps, flagged });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}
