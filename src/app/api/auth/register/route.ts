import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPin } from "@/lib/auth";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { asString, normalizeCashtag } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const cashtag = normalizeCashtag(body.cashtag);
    const displayName = asString(body.displayName);
    const pin = asString(body.pin);
    const dateOfBirth = asString(body.dateOfBirth);

    if (!cashtag) {
      throw new HttpError(400, "Enter a valid Cash App $cashtag (letters, numbers, underscore).");
    }
    if (displayName.length < 2 || displayName.length > 30) {
      throw new HttpError(400, "Display name must be 2-30 characters.");
    }
    if (!/^\d{4,6}$/.test(pin)) {
      throw new HttpError(400, "PIN must be 4-6 digits.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      throw new HttpError(400, "Enter your date of birth.");
    }

    const dob = new Date(`${dateOfBirth}T00:00:00Z`);
    if (Number.isNaN(dob.getTime())) {
      throw new HttpError(400, "Enter a valid date of birth.");
    }
    const now = new Date();
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
      age -= 1;
    }
    if (age < 18) {
      throw new HttpError(400, "You must be 18 or older to join Walk Challenge.");
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.cashtag, cashtag))
      .limit(1);
    if (existing.length > 0) {
      throw new HttpError(409, "That Cash App tag already has an account. Log in instead.");
    }

    const [user] = await db
      .insert(users)
      .values({ cashtag, displayName, pinHash: await hashPin(pin), dateOfBirth })
      .returning({ id: users.id, cashtag: users.cashtag, displayName: users.displayName });

    await createSession(user.id);
    return Response.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
