import { isAdminRequest } from "@/lib/auth";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { cancelUnpaidEntry, confirmEntryPaid } from "@/lib/rooms";

export const dynamic = "force-dynamic";

// action: "confirm" = Cash App payment verified, "cancel" = free the seat (unpaid only)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdminRequest(req)) throw new HttpError(401, "Admin password required.");

    const { id } = await params;
    const entryId = Number(id);
    if (!Number.isInteger(entryId)) throw new HttpError(400, "Invalid entry.");

    const body = await readJson(req);
    if (body.action === "confirm") {
      const result = await confirmEntryPaid(entryId);
      return Response.json({
        entry: { id: result.entry.id, status: result.entry.status },
        roomActivated: result.activated,
      });
    }
    if (body.action === "cancel") {
      const entry = await cancelUnpaidEntry(entryId);
      return Response.json({ entry: { id: entry.id, status: entry.status } });
    }
    throw new HttpError(400, "action must be 'confirm' or 'cancel'.");
  } catch (error) {
    return errorResponse(error);
  }
}
