import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { sendCashAppPayout } from "@/lib/payouts";
import { asString } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * actions:
 *  - send: run the payout bot for this payout (uses provider if configured)
 *  - mark_paid: you sent it in Cash App; optional providerRef = Cash App transaction ID
 *  - mark_failed: payout did not go through
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdminRequest(req)) throw new HttpError(401, "Admin password required.");

    const { id } = await params;
    const payoutId = Number(id);
    if (!Number.isInteger(payoutId)) throw new HttpError(400, "Invalid payout.");

    const body = await readJson(req);
    const action = asString(body.action);

    const [payout] = await db.select().from(payouts).where(eq(payouts.id, payoutId)).limit(1);
    if (!payout) throw new HttpError(404, "Payout not found.");
    if (payout.status === "paid") throw new HttpError(400, "This payout is already paid.");

    if (action === "send") {
      try {
        const result = await sendCashAppPayout({
          payoutId: payout.id,
          cashtag: payout.cashtag,
          amountCents: payout.amountCents,
          note: payout.note ?? "Walk challenge prize",
        });

        if (result.mode === "provider") {
          const [updated] = await db
            .update(payouts)
            .set({ status: "sent", providerRef: result.providerRef })
            .where(eq(payouts.id, payoutId))
            .returning();
          return Response.json({ payout: updated, message: result.message });
        }
        return Response.json({ payout, message: result.message });
      } catch (error) {
        await db
          .update(payouts)
          .set({ status: "failed", note: `Bot error: ${error instanceof Error ? error.message : "unknown"}` })
          .where(eq(payouts.id, payoutId));
        throw new HttpError(502, error instanceof Error ? error.message : "Payout failed.");
      }
    }

    if (action === "mark_paid") {
      const providerRef = asString(body.providerRef) || null;
      const [updated] = await db
        .update(payouts)
        .set({ status: "paid", paidAt: new Date(), providerRef: providerRef ?? payout.providerRef })
        .where(eq(payouts.id, payoutId))
        .returning();
      return Response.json({ payout: updated });
    }

    if (action === "mark_failed") {
      const [updated] = await db
        .update(payouts)
        .set({ status: "failed" })
        .where(eq(payouts.id, payoutId))
        .returning();
      return Response.json({ payout: updated });
    }

    throw new HttpError(400, "action must be send, mark_paid, or mark_failed.");
  } catch (error) {
    return errorResponse(error);
  }
}
