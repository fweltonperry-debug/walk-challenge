import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { entries, rooms, users } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: Record<string, string[]> = {
  open: ["awaiting_payment", "payment_claimed"],
  paid: ["paid"],
  cancelled: ["refunded"],
  all: ["awaiting_payment", "payment_claimed", "paid", "refunded"],
};

export async function GET(req: Request) {
  try {
    if (!isAdminRequest(req)) throw new HttpError(401, "Admin password required.");

    const filter = new URL(req.url).searchParams.get("status") ?? "open";
    const statuses = STATUS_FILTERS[filter] ?? STATUS_FILTERS.open;

    const rows = await db
      .select({
        id: entries.id,
        roomId: entries.roomId,
        status: entries.status,
        paymentCode: entries.paymentCode,
        amountCents: entries.amountCents,
        createdAt: entries.createdAt,
        paidAt: entries.paidAt,
        tier: rooms.tier,
        roomStatus: rooms.status,
        cashtag: users.cashtag,
        displayName: users.displayName,
      })
      .from(entries)
      .innerJoin(rooms, eq(rooms.id, entries.roomId))
      .innerJoin(users, eq(users.id, entries.userId))
      .where(inArray(entries.status, statuses))
      .orderBy(desc(entries.createdAt))
      .limit(300);

    return Response.json({ entries: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
