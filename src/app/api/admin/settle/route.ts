import { isAdminRequest, isCronRequest } from "@/lib/auth";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { settleDueRooms, settleRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";

/**
 * Settles rooms whose period has ended. Call from a scheduler with
 * Authorization: Bearer CRON_SECRET, or from the admin panel.
 * Admins may pass { roomId } to settle a specific active room early.
 */
export async function POST(req: Request) {
  try {
    const admin = isAdminRequest(req);
    if (!admin && !isCronRequest(req)) throw new HttpError(401, "Admin password required.");

    if (admin) {
      const body = await readJson(req);
      if (typeof body.roomId === "number") {
        const result = await settleRoom(body.roomId);
        return Response.json({ results: [result] });
      }
    }

    const results = await settleDueRooms();
    return Response.json({ results });
  } catch (error) {
    return errorResponse(error);
  }
}
