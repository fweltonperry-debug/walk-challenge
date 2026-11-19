import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, payouts, rooms, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";
import { getLeaderboard, previewPrizes } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Log in first.");

    const { id } = await params;
    const roomId = Number(id);
    if (!Number.isInteger(roomId)) throw new HttpError(400, "Invalid room.");

    const [room] = await db
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
      })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);
    if (!room) throw new HttpError(404, "Room not found.");

    const board = await getLeaderboard(roomId);
    const pool = board.reduce((sum, row) => sum + row.amountCents, 0);
    const eligible = board.filter((row) => row.totalSteps > 0).length;

    const winners = await db
      .select({
        place: payouts.place,
        amountCents: payouts.amountCents,
        status: payouts.status,
        displayName: users.displayName,
      })
      .from(payouts)
      .innerJoin(users, eq(users.id, payouts.userId))
      .where(eq(payouts.roomId, roomId))
      .orderBy(payouts.place);

    const [mine] = await db
      .select({ id: entries.id, status: entries.status })
      .from(entries)
      .where(and(eq(entries.roomId, roomId), eq(entries.userId, user.id)))
      .limit(1);

    return Response.json({
      room: {
        ...room,
        paidSeats: board.length,
      },
      leaderboard: board.map((row) => ({
        rank: row.rank,
        displayName: row.displayName,
        totalSteps: row.totalSteps,
        isYou: row.userId === user.id,
      })),
      prizes: previewPrizes(pool, eligible),
      winners,
      myEntry: mine ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
