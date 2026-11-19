import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, payouts, rooms, stepLogs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";
import { utcDate } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Log in first.");

    const today = utcDate(new Date());

    const myEntries = await db
      .select({
        id: entries.id,
        roomId: entries.roomId,
        status: entries.status,
        paymentCode: entries.paymentCode,
        amountCents: entries.amountCents,
        createdAt: entries.createdAt,
        tier: rooms.tier,
        roomStatus: rooms.status,
        capacity: rooms.capacity,
        startsAt: rooms.startsAt,
        endsAt: rooms.endsAt,
      })
      .from(entries)
      .innerJoin(rooms, eq(rooms.id, entries.roomId))
      .where(eq(entries.userId, user.id))
      .orderBy(desc(entries.createdAt));

    const totals = await db
      .select({
        entryId: stepLogs.entryId,
        total: sql<number>`coalesce(sum(${stepLogs.steps}), 0)`.mapWith(Number),
        todaySteps: sql<number | null>`max(case when ${stepLogs.logDate} = ${today} then ${stepLogs.steps} end)`,
      })
      .from(stepLogs)
      .where(eq(stepLogs.userId, user.id))
      .groupBy(stepLogs.entryId);

    const totalsByEntry = new Map(totals.map((t) => [t.entryId, t]));

    const myPayouts = await db
      .select({
        id: payouts.id,
        roomId: payouts.roomId,
        place: payouts.place,
        amountCents: payouts.amountCents,
        status: payouts.status,
        createdAt: payouts.createdAt,
        paidAt: payouts.paidAt,
      })
      .from(payouts)
      .where(eq(payouts.userId, user.id))
      .orderBy(desc(payouts.createdAt));

    return Response.json({
      user,
      today,
      entries: myEntries.map((entry) => {
        const t = totalsByEntry.get(entry.id);
        return {
          ...entry,
          totalSteps: t?.total ?? 0,
          todaySteps: t?.todaySteps ?? null,
        };
      }),
      payouts: myPayouts,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
