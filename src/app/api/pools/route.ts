import { db } from "@/db";
import { pools, entries } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allPools = await db.select().from(pools).orderBy(desc(pools.startsAt));
    const result = [];
    for (const p of allPools) {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(entries)
        .where(eq(entries.poolId, p.id));
      const verifiedRow = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(entries)
        .where(eq(entries.poolId, p.id));
      // count verified separately via query
      const verifiedCount = await db.execute(
        sql`SELECT count(*)::int as c FROM entries WHERE pool_id = ${p.id} AND payment_status = 'verified'`
      );
      const vc = (verifiedCount.rows[0] as any)?.c ?? 0;
      result.push({
        ...p,
        entryFee: Number(p.entryFee),
        participantCount: Number(countRow?.count ?? 0),
        verifiedCount: Number(vc),
      });
    }
    return Response.json({ pools: result });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to load pools" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, title, entryFee, startsAt, endsAt } = body;
    if (!type || !entryFee || !startsAt || !endsAt) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }
    const [created] = await db
      .insert(pools)
      .values({
        type,
        title: title || `${type} Pool`,
        entryFee: String(entryFee),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        status: "open",
        maxParticipants: 35,
      })
      .returning();
    return Response.json({ pool: created });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create pool" }, { status: 500 });
  }
}
