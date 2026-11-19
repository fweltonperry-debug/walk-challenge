import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, payouts, rooms } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!isAdminRequest(req)) throw new HttpError(401, "Admin password required.");

    const roomCounts = await db
      .select({ status: rooms.status, count: sql<number>`count(*)`.mapWith(Number) })
      .from(rooms)
      .groupBy(rooms.status);

    const entryCounts = await db
      .select({ status: entries.status, count: sql<number>`count(*)`.mapWith(Number) })
      .from(entries)
      .groupBy(entries.status);

    const [revenue] = await db
      .select({ total: sql<number>`coalesce(sum(${entries.amountCents}), 0)`.mapWith(Number) })
      .from(entries)
      .where(eq(entries.status, "paid"));

    const [platform] = await db
      .select({ total: sql<number>`coalesce(sum(${rooms.platformCents}), 0)`.mapWith(Number) })
      .from(rooms)
      .where(eq(rooms.status, "completed"));

    const payoutTotals = await db
      .select({
        status: payouts.status,
        total: sql<number>`coalesce(sum(${payouts.amountCents}), 0)`.mapWith(Number),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(payouts)
      .groupBy(payouts.status);

    return Response.json({
      rooms: roomCounts,
      entries: entryCounts,
      paidRevenueCents: revenue?.total ?? 0,
      platformEarnedCents: platform?.total ?? 0,
      payouts: payoutTotals,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
