import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { payouts } from "@/db/schema";
import { isAdminRequest, isCronRequest } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";
import { payoutProviderConfigured, sendCashAppPayout } from "@/lib/payouts";

export const dynamic = "force-dynamic";

/** Payout bot: runs every pending/failed payout through the configured provider. */
export async function POST(req: Request) {
  try {
    if (!isAdminRequest(req) && !isCronRequest(req)) {
      throw new HttpError(401, "Admin password required.");
    }

    const queue = await db
      .select()
      .from(payouts)
      .where(inArray(payouts.status, ["pending", "failed"]))
      .limit(100);

    const results: Array<{ id: number; status: string; message: string }> = [];

    for (const payout of queue) {
      try {
        const result = await sendCashAppPayout({
          payoutId: payout.id,
          cashtag: payout.cashtag,
          amountCents: payout.amountCents,
          note: payout.note ?? "Walk challenge prize",
        });

        if (result.mode === "provider") {
          await db
            .update(payouts)
            .set({ status: "sent", providerRef: result.providerRef })
            .where(inArray(payouts.id, [payout.id]));
        }
        results.push({ id: payout.id, status: result.status, message: result.message });
      } catch (error) {
        await db
          .update(payouts)
          .set({ status: "failed" })
          .where(inArray(payouts.id, [payout.id]));
        results.push({
          id: payout.id,
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return Response.json({
      providerConfigured: payoutProviderConfigured(),
      processed: results.length,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
