import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ageFromBirthDate, MIN_AGE } from "@/lib/age";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, displayName, cashTag, birthDate, agreeTerms } = body;
    if (!username || !cashTag) {
      return Response.json({ error: "Username and Cash Tag required" }, { status: 400 });
    }

    // 18+ check (enforced server-side)
    const age = ageFromBirthDate(birthDate);
    if (age === null) {
      return Response.json({ error: "Please enter a valid date of birth" }, { status: 400 });
    }
    if (age < MIN_AGE) {
      return Response.json({ error: `You must be ${MIN_AGE} or older to use StepCash.` }, { status: 403 });
    }
    if (!agreeTerms) {
      return Response.json({ error: "You must agree to the Terms of Service" }, { status: 400 });
    }

    const cleanTag = cashTag.trim().startsWith("$") ? cashTag.trim() : `$${cashTag.trim()}`;
    const cleanUser = username.toLowerCase().trim();

    const [existing] = await db.select().from(users).where(eq(users.username, cleanUser));
    if (existing) {
      // An existing user's birth date can be set once but never changed
      if (existing.birthDate && existing.birthDate !== birthDate) {
        return Response.json({ error: "Date of birth doesn't match this account" }, { status: 403 });
      }
      const [updated] = await db
        .update(users)
        .set({
          cashTag: cleanTag,
          displayName: displayName || existing.displayName,
          birthDate: existing.birthDate ?? birthDate,
          agreedTermsAt: existing.agreedTermsAt ?? new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return Response.json({ user: updated });
    }

    const [created] = await db
      .insert(users)
      .values({
        username: cleanUser,
        displayName: displayName || cleanUser,
        cashTag: cleanTag,
        isAdmin: false,
        birthDate,
        agreedTermsAt: new Date(),
      })
      .returning();
    return Response.json({ user: created });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ user });
}
