import { db } from "@/db";
import { users, pools, entries, settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // settings
    await db
      .insert(settings)
      .values({ key: "house_cashtagg", value: "$stockhunger" })
      .onConflictDoNothing();
    await db
      .insert(settings)
      .values({ key: "bot_enabled", value: "true" })
      .onConflictDoNothing();

    // admin user
    await db
      .insert(users)
      .values({ username: "admin", displayName: "StepCash Admin", cashTag: "$StepCashAdmin", isAdmin: true })
      .onConflictDoNothing();

    const demoUsers = [
      { username: "mike_runs", displayName: "Mike R.", cashTag: "$MikeRuns" },
      { username: "sarah_steps", displayName: "Sarah S.", cashTag: "$SarahSteps" },
      { username: "jake_jog", displayName: "Jake J.", cashTag: "$JakeJog" },
      { username: "emma_walk", displayName: "Emma W.", cashTag: "$EmmaWalk" },
      { username: "david_dash", displayName: "David D.", cashTag: "$DavidDash" },
      { username: "lisa_legday", displayName: "Lisa L.", cashTag: "$LisaLegDay" },
      { username: "chris_cardio", displayName: "Chris C.", cashTag: "$ChrisCardio" },
      { username: "anna_active", displayName: "Anna A.", cashTag: "$AnnaActive" },
    ];

    const createdUsers = [];
    for (const u of demoUsers) {
      const [existing] = await db.select().from(users).where(eq(users.username, u.username));
      if (existing) {
        createdUsers.push(existing);
      } else {
        const [c] = await db.insert(users).values(u).returning();
        createdUsers.push(c);
      }
    }

    // check if pools exist
    const existingPools = await db.select().from(pools);
    if (existingPools.length > 0) {
      return Response.json({ ok: true, message: "Already seeded", pools: existingPools.length });
    }

    const now = new Date();
    const inHours = (h: number) => new Date(now.getTime() + h * 3600000);
    const inDays = (d: number) => new Date(now.getTime() + d * 86400000);

    const poolDefs = [
      { type: "daily", title: "Daily Sprint — $5", entryFee: "5.00", startsAt: new Date(now.getTime() - 2 * 3600000), endsAt: inHours(14) },
      { type: "weekly", title: "Weekly Grind — $10", entryFee: "10.00", startsAt: new Date(now.getTime() - 24 * 3600000), endsAt: inDays(4) },
      { type: "monthly", title: "Monthly Marathon — $30", entryFee: "30.00", startsAt: new Date(now.getTime() - 2 * 86400000), endsAt: inDays(22) },
      { type: "yearly", title: "Yearly Champion — $100", entryFee: "100.00", startsAt: now, endsAt: inDays(340) },
    ];

    const createdPools = [];
    for (const p of poolDefs) {
      const [c] = await db.insert(pools).values({ ...p, status: "open", maxParticipants: 35 }).returning();
      createdPools.push(c);
    }

    // seed entries for daily + weekly
    const daily = createdPools[0];
    const weekly = createdPools[1];
    const dailySteps = [18420, 15230, 12840, 11200, 9800, 8400, 7200, 6100];
    const weeklySteps = [74200, 68900, 62100, 55400, 49800, 43100, 38200, 31500];

    for (let i = 0; i < createdUsers.length; i++) {
      await db.insert(entries).values({
        poolId: daily.id,
        userId: createdUsers[i].id,
        cashAppTxId: `CA-DEMO-${1000 + i}`,
        paymentStatus: "verified",
        steps: dailySteps[i],
      });
      await db.insert(entries).values({
        poolId: weekly.id,
        userId: createdUsers[i].id,
        cashAppTxId: `CA-DEMO-W-${1000 + i}`,
        paymentStatus: "verified",
        steps: weeklySteps[i],
      });
    }

    return Response.json({ ok: true, pools: createdPools.length, users: createdUsers.length });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Seed failed" }, { status: 500 });
  }
}
