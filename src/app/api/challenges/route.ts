import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, rooms } from "@/db/schema";
import { errorResponse } from "@/lib/http";
import { CAPACITY, operatorCashtag, PLACE_SPLITS, PLATFORM_PERCENT, TIERS } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: rooms.id,
        tier: rooms.tier,
        status: rooms.status,
        capacity: rooms.capacity,
        startsAt: rooms.startsAt,
        endsAt: rooms.endsAt,
        seats: sql<number>`count(${entries.id}) filter (where ${entries.status} <> 'refunded')`.mapWith(Number),
        paid: sql<number>`count(${entries.id}) filter (where ${entries.status} = 'paid')`.mapWith(Number),
      })
      .from(rooms)
      .leftJoin(entries, eq(entries.roomId, rooms.id))
      .where(inArray(rooms.status, ["filling", "active"]))
      .groupBy(rooms.id)
      .orderBy(asc(rooms.id));

    const tiers = TIERS.map((tier) => {
      const filling = rows.filter((r) => r.tier === tier.key && r.status === "filling");
      const openSeat = filling.find((r) => r.seats < CAPACITY) ?? filling[0] ?? null;
      const active = rows.filter((r) => r.tier === tier.key && r.status === "active");

      return {
        ...tier,
        capacity: CAPACITY,
        filling: openSeat
          ? { id: openSeat.id, seats: openSeat.seats, paid: openSeat.paid, capacity: openSeat.capacity }
          : null,
        activeRooms: active.map((r) => ({
          id: r.id,
          paid: r.paid,
          capacity: r.capacity,
          startsAt: r.startsAt,
          endsAt: r.endsAt,
        })),
      };
    });

    return Response.json({
      tiers,
      cashtag: operatorCashtag(),
      platformPercent: PLATFORM_PERCENT,
      placeSplits: PLACE_SPLITS,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
