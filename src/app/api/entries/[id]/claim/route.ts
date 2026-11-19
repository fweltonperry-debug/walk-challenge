import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

// The user says "I sent the Cash App payment". The admin then verifies it and confirms.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Log in first.");

    const { id } = await params;
    const entryId = Number(id);
    if (!Number.isInteger(entryId)) throw new HttpError(400, "Invalid entry.");

    const [updated] = await db
      .update(entries)
      .set({ status: "payment_claimed" })
      .where(
        and(
          eq(entries.id, entryId),
          eq(entries.userId, user.id),
          eq(entries.status, "awaiting_payment"),
        ),
      )
      .returning({ id: entries.id, status: entries.status });

    if (!updated) throw new HttpError(400, "This entry is not waiting for payment.");
    return Response.json({ entry: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
