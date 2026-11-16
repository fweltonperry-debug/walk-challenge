import { db } from "@/db";
import { entries, pools, users } from "@/db/schema";
import { isAdult } from "@/lib/age";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { poolId, userId, cashAppTxId } = body;
    if (!poolId || !userId) return Response.json({ error: "poolId and userId required" }, { status: 400 });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });
    if (!isAdult(user.birthDate)) {
      return Response.json({ error: "You must be 18 or older to enter. Update your profile on the Dashboard." }, { status: 403 });
    }

    const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
    if (!pool) return Response.json({ error: "Pool not found" }, { status: 404 });
    if (pool.status !== "open" || new Date(pool.endsAt) <= new Date()) {
      return Response.json({ error: "This pool is closed" }, { status: 400 });
    }

    // check duplicate
    const [dup] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.poolId, poolId), eq(entries.userId, userId)));
    if (dup) return Response.json({ error: "Already entered this pool" }, { status: 400 });

    // check capacity
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(entries)
      .where(eq(entries.poolId, poolId));
    if (Number(countRow?.count ?? 0) >= 35) {
      return Response.json({ error: "Pool is full (35/35)" }, { status: 400 });
    }

    const [created] = await db
      .insert(entries)
      .values({
        poolId,
        userId,
        cashAppTxId: cashAppTxId || null,
        paymentStatus: "pending",
        steps: 0,
      })
      .returning();
    return Response.json({ entry: created });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to join" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  const rows = await db.select().from(entries).where(eq(entries.userId, parseInt(userId)));
  // enrich with pool info
  const enriched = [];
  for (const e of rows) {
    const [p] = await db.select().from(pools).where(eq(pools.id, e.poolId));
    enriched.push({ ...e, pool: p ? { ...p, entryFee: Number(p.entryFee) } : null });
  }
  return Response.json({ entries: enriched });
}
