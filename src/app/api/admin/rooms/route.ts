import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, rooms } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!isAdminRequest(req)) throw new HttpError(401, "Admin password required.");

    const rows = await db
      .select({
        id: rooms.id,
        tier: rooms.tier,
        feeCents: rooms.feeCents,
        status: rooms.status,
        capacity: rooms.capacity,
        startsAt: rooms.startsAt,
        endsAt: rooms.endsAt,
        poolCents: rooms.poolCents,
        prizePoolCents: rooms.prizePoolCents,
        platformCents: rooms.platformCents,
        settledAt: rooms.settledAt,
        paid: sql<number>`count(${entries.id}) filter (where ${entries.status} = 'paid')`.mapWith(Number),
        pending: sql<number>`count(${entries.id}) filter (where ${entries.status} in ('awaiting_payment','payment_claimed'))`.mapWith(Number),
      })
      .from(rooms)
      .leftJoin(entries, eq(entries.roomId, rooms.id))
      .groupBy(rooms.id)
      .orderBy(desc(rooms.id))
      .limit(200);

    return Response.json({ rooms: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
