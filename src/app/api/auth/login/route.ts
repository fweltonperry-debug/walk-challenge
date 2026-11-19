import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPin } from "@/lib/auth";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { asString, normalizeCashtag } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const cashtag = normalizeCashtag(body.cashtag);
    const pin = asString(body.pin);

    if (!cashtag || !pin) {
      throw new HttpError(400, "Enter your Cash App $cashtag and PIN.");
    }

    const [user] = await db
      .select({
        id: users.id,
        cashtag: users.cashtag,
        displayName: users.displayName,
        pinHash: users.pinHash,
      })
      .from(users)
      .where(eq(users.cashtag, cashtag))
      .limit(1);

    if (!user || !(await verifyPin(pin, user.pinHash))) {
      throw new HttpError(401, "Wrong $cashtag or PIN.");
    }

    await createSession(user.id);
    return Response.json({
      user: { id: user.id, cashtag: user.cashtag, displayName: user.displayName },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
