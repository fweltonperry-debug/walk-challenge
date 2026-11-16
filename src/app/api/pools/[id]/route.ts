import { db } from "@/db";
import { pools, entries, users, payouts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const poolId = parseInt(id);
    const [pool] = await db.select().from(pools).where(eq(pools.id, poolId));
    if (!pool) return Response.json({ error: "Pool not found" }, { status: 404 });

    const poolEntries = await db
      .select({
        entry: entries,
        user: users,
      })
      .from(entries)
      .innerJoin(users, eq(entries.userId, users.id))
      .where(eq(entries.poolId, poolId))
      .orderBy(desc(entries.steps));

    const poolPayouts = await db.select().from(payouts).where(eq(payouts.poolId, poolId));

    return Response.json({
      pool: { ...pool, entryFee: Number(pool.entryFee) },
      entries: poolEntries.map((r) => ({
        ...r.entry,
        user: r.user,
      })),
      payouts: poolPayouts,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
