import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts, rooms, users } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";
import { payoutProviderConfigured } from "@/lib/payouts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!isAdminRequest(req)) throw new HttpError(401, "Admin password required.");

    const filter = new URL(req.url).searchParams.get("status");

    const base = db
      .select({
        id: payouts.id,
        roomId: payouts.roomId,
        place: payouts.place,
        amountCents: payouts.amountCents,
        cashtag: payouts.cashtag,
        status: payouts.status,
        providerRef: payouts.providerRef,
        note: payouts.note,
        createdAt: payouts.createdAt,
        paidAt: payouts.paidAt,
        tier: rooms.tier,
        displayName: users.displayName,
      })
      .from(payouts)
      .innerJoin(rooms, eq(rooms.id, payouts.roomId))
      .innerJoin(users, eq(users.id, payouts.userId));

    const rows = await (filter
      ? base.where(eq(payouts.status, filter)).orderBy(desc(payouts.id)).limit(300)
      : base.orderBy(desc(payouts.id)).limit(300));

    return Response.json({ payouts: rows, providerConfigured: payoutProviderConfigured() });
  } catch (error) {
    return errorResponse(error);
  }
}
