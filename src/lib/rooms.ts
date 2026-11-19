import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, payouts, rooms, stepLogs, users } from "@/db/schema";
import { HttpError } from "@/lib/http";
import { CAPACITY, MAX_DAILY_STEPS, computeSettlement, getTier } from "@/lib/tiers";

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const DAY_MS = 24 * 60 * 60 * 1000;

function randomPaymentCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (const byte of randomBytes(6)) {
    code += chars[byte % chars.length];
  }
  return `WALK-${code}`;
}

export function utcDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Puts the user into the first filling room for a tier, creating a new room when all are full. */
export async function joinRoom(userId: number, tierKey: string) {
  const tier = getTier(tierKey);
  if (!tier) throw new HttpError(400, "Unknown challenge tier.");

  return db.transaction(async (tx) => {
    // Serialize joins per tier so two people can't grab the same last seat.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${tier.key}))`);

    const fillingRooms = await tx
      .select({
        id: rooms.id,
        seats: sql<number>`count(${entries.id})`.mapWith(Number),
      })
      .from(rooms)
      .leftJoin(entries, and(eq(entries.roomId, rooms.id), ne(entries.status, "refunded")))
      .where(and(eq(rooms.tier, tier.key), eq(rooms.status, "filling")))
      .groupBy(rooms.id)
      .orderBy(asc(rooms.id));

    let roomId: number | null = null;
    for (const room of fillingRooms) {
      if (room.seats < CAPACITY) {
        roomId = room.id;
        break;
      }
    }

    if (roomId !== null) {
      const [alreadyIn] = await tx
        .select({ id: entries.id })
        .from(entries)
        .where(and(eq(entries.roomId, roomId), eq(entries.userId, userId), ne(entries.status, "refunded")))
        .limit(1);
      if (alreadyIn) {
        throw new HttpError(409, "You already have a seat in this room. Finish paying for it first.");
      }
    } else {
      const [created] = await tx
        .insert(rooms)
        .values({
          tier: tier.key,
          feeCents: tier.feeCents,
          durationDays: tier.durationDays,
          capacity: CAPACITY,
          status: "filling",
        })
        .returning({ id: rooms.id });
      roomId = created.id;
    }

    const [entry] = await tx
      .insert(entries)
      .values({
        roomId,
        userId,
        paymentCode: randomPaymentCode(),
        amountCents: tier.feeCents,
        status: "awaiting_payment",
      })
      .returning();

    return { entry, roomId };
  });
}

/** Admin confirms a Cash App payment arrived. Activates the room once all seats are paid. */
export async function confirmEntryPaid(entryId: number) {
  return db.transaction(async (tx) => {
    const [entry] = await tx.select().from(entries).where(eq(entries.id, entryId)).for("update");
    if (!entry) throw new HttpError(404, "Entry not found.");
    if (entry.status === "paid") return { entry, activated: false };
    if (entry.status === "refunded") throw new HttpError(400, "This entry was cancelled.");

    const [updated] = await tx
      .update(entries)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(entries.id, entryId))
      .returning();

    const activated = await activateRoomIfFull(tx, entry.roomId);
    return { entry: updated, activated };
  });
}

/** Admin cancels an unpaid seat, freeing it for someone else. */
export async function cancelUnpaidEntry(entryId: number) {
  const [entry] = await db.select().from(entries).where(eq(entries.id, entryId)).limit(1);
  if (!entry) throw new HttpError(404, "Entry not found.");
  if (entry.status === "paid") {
    throw new HttpError(400, "Paid entries cannot be cancelled here. Refund them manually.");
  }
  const [updated] = await db
    .update(entries)
    .set({ status: "refunded" })
    .where(eq(entries.id, entryId))
    .returning();
  return updated;
}

async function activateRoomIfFull(tx: Tx, roomId: number) {
  const [room] = await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
  if (!room || room.status !== "filling") return false;

  const [{ paid }] = await tx
    .select({ paid: sql<number>`count(*)`.mapWith(Number) })
    .from(entries)
    .where(and(eq(entries.roomId, roomId), eq(entries.status, "paid")));

  if (paid < room.capacity) return false;

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + room.durationDays * DAY_MS);
  await tx.update(rooms).set({ status: "active", startsAt, endsAt }).where(eq(rooms.id, roomId));
  return true;
}

/** Records (or overwrites) a day's step count for a paid entry in an active room. */
export async function logSteps(userId: number, entryId: number, logDate: string, steps: number) {
  if (!Number.isInteger(steps) || steps < 0 || steps > MAX_DAILY_STEPS) {
    throw new HttpError(400, `Steps must be a whole number between 0 and ${MAX_DAILY_STEPS.toLocaleString()}.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    throw new HttpError(400, "Date must be YYYY-MM-DD.");
  }

  const [row] = await db
    .select({
      entryId: entries.id,
      roomId: entries.roomId,
      entryStatus: entries.status,
      roomStatus: rooms.status,
      startsAt: rooms.startsAt,
      endsAt: rooms.endsAt,
    })
    .from(entries)
    .innerJoin(rooms, eq(rooms.id, entries.roomId))
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .limit(1);

  if (!row) throw new HttpError(404, "Entry not found.");
  if (row.entryStatus !== "paid") throw new HttpError(400, "Pay for this challenge before logging steps.");
  if (row.roomStatus !== "active" || !row.startsAt || !row.endsAt) {
    throw new HttpError(400, "This challenge has not started yet. It starts when all seats are paid.");
  }

  const today = utcDate(new Date());
  const firstDay = utcDate(row.startsAt);
  const lastDay = utcDate(row.endsAt);
  if (logDate < firstDay || logDate > lastDay) {
    throw new HttpError(400, `Steps can only be logged between ${firstDay} and ${lastDay}.`);
  }
  if (logDate > today) {
    throw new HttpError(400, "You cannot log steps for a future date.");
  }

  const [saved] = await db
    .insert(stepLogs)
    .values({
      entryId,
      roomId: row.roomId,
      userId,
      logDate,
      steps,
    })
    .onConflictDoUpdate({
      target: [stepLogs.entryId, stepLogs.logDate],
      set: { steps, updatedAt: new Date() },
    })
    .returning();

  return saved;
}

/** Ranked leaderboard of paid entries for a room. */
async function leaderboardQuery(executor: Db | Tx, roomId: number) {
  const totalSteps = sql<number>`coalesce(sum(${stepLogs.steps}), 0)`.mapWith(Number);

  const rows = await executor
    .select({
      entryId: entries.id,
      userId: users.id,
      displayName: users.displayName,
      cashtag: users.cashtag,
      amountCents: entries.amountCents,
      totalSteps,
    })
    .from(entries)
    .innerJoin(users, eq(users.id, entries.userId))
    .leftJoin(stepLogs, eq(stepLogs.entryId, entries.id))
    .where(and(eq(entries.roomId, roomId), eq(entries.status, "paid")))
    .groupBy(entries.id, users.id, users.displayName, users.cashtag)
    .orderBy(desc(totalSteps), asc(entries.paidAt), asc(entries.id));

  return rows.map((row, index) => ({ rank: index + 1, ...row }));
}

export async function getLeaderboard(roomId: number) {
  return db.transaction((tx) => leaderboardQuery(tx, roomId));
}

export function previewPrizes(poolCents: number, eligibleWinners: number) {
  const settlement = computeSettlement(poolCents);
  return settlement.amounts.map((amount, i) => ({
    place: i + 1,
    amountCents: i < eligibleWinners ? amount : 0,
  }));
}

/** Settles one active room: pays top 3 by steps, records the 10% platform cut. */
export async function settleRoom(roomId: number) {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .update(rooms)
      .set({ status: "completed", settledAt: new Date() })
      .where(and(eq(rooms.id, roomId), eq(rooms.status, "active")))
      .returning({ id: rooms.id });

    if (claimed.length === 0) return { roomId, settled: false, winners: [] as Array<{ place: number; cashtag: string; amountCents: number; totalSteps: number }> };

    const board = await leaderboardQuery(tx, roomId);
    const poolCents = board.reduce((sum, row) => sum + row.amountCents, 0);
    const settlement = computeSettlement(poolCents);
    const winners = board.filter((row) => row.totalSteps > 0).slice(0, settlement.amounts.length);

    const created: Array<{ place: number; cashtag: string; amountCents: number; totalSteps: number }> = [];
    let paidOut = 0;

    for (const [index, winner] of winners.entries()) {
      const amountCents = settlement.amounts[index];
      paidOut += amountCents;
      await tx.insert(payouts).values({
        roomId,
        entryId: winner.entryId,
        userId: winner.userId,
        place: index + 1,
        amountCents,
        cashtag: winner.cashtag,
        status: "pending",
        note: `Walk challenge prize - place ${index + 1}`,
      });
      created.push({ place: index + 1, cashtag: winner.cashtag, amountCents, totalSteps: winner.totalSteps });
    }

    await tx
      .update(rooms)
      .set({
        poolCents,
        prizePoolCents: settlement.prizePool,
        platformCents: poolCents - paidOut,
      })
      .where(eq(rooms.id, roomId));

    return { roomId, settled: true, winners: created };
  });
}

/** Settles every active room whose competition period has ended. */
export async function settleDueRooms() {
  const due = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.status, "active"), lte(rooms.endsAt, new Date())));

  const results = [];
  for (const room of due) {
    results.push(await settleRoom(room.id));
  }
  return results;
}
