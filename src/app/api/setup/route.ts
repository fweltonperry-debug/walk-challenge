import { db } from "@/db";
import { pools, settings, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdult } from "@/lib/age";
import { POOL_CONFIG, type PoolType } from "@/lib/prizes";

export const dynamic = "force-dynamic";

const DAYS: Record<PoolType, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };

/**
 * One-time launch setup for a fresh database (no demo data).
 * Requires SETUP_KEY env var. Creates the admin account, house settings and 4 real pools.
 */
export async function POST(req: Request) {
  try {
    const setupKey = process.env.SETUP_KEY;
    if (!setupKey) {
      return Response.json({ error: "SETUP_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables." }, { status: 500 });
    }
    const { key, adminBirthDate } = await req.json();
    if (key !== setupKey) return Response.json({ error: "Wrong setup key" }, { status: 403 });
    if (!isAdult(adminBirthDate)) return Response.json({ error: "Enter a valid admin date of birth (18+)" }, { status: 400 });

    const [existingAdmin] = await db.select().from(users).where(eq(users.username, "admin"));
    if (existingAdmin) return Response.json({ error: "Setup already done. Log in as admin on the Dashboard." }, { status: 400 });

    await db.insert(users).values({
      username: "admin",
      displayName: "StepCash Admin",
      cashTag: "$stockhunger",
      isAdmin: true,
      birthDate: adminBirthDate,
      agreedTermsAt: new Date(),
    });

    for (const [k, v] of [["house_cashtagg", "$stockhunger"], ["bot_enabled", "true"]]) {
      await db.insert(settings).values({ key: k, value: v }).onConflictDoUpdate({ target: settings.key, set: { value: v } });
    }

    const existingPools = await db.select().from(pools);
    if (existingPools.length === 0) {
      const now = Date.now();
      for (const type of Object.keys(POOL_CONFIG) as PoolType[]) {
        const cfg = POOL_CONFIG[type];
        await db.insert(pools).values({
          type,
          title: `${cfg.label} Pool — $${cfg.fee}`,
          entryFee: cfg.fee.toFixed(2),
          startsAt: new Date(now),
          endsAt: new Date(now + DAYS[type] * 86400000),
          status: "open",
          maxParticipants: 35,
        });
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Setup failed" }, { status: 500 });
  }
}
