import { getCurrentUser } from "@/lib/auth";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { joinRoom } from "@/lib/rooms";
import { operatorCashtag } from "@/lib/tiers";
import { asString } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Log in first.");

    const body = await readJson(req);
    const tier = asString(body.tier);
    if (!tier) throw new HttpError(400, "Choose a challenge tier.");

    const { entry, roomId } = await joinRoom(user.id, tier);

    return Response.json({
      entry: {
        id: entry.id,
        roomId,
        status: entry.status,
        paymentCode: entry.paymentCode,
        amountCents: entry.amountCents,
      },
      cashtag: operatorCashtag(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
