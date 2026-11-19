// Core business rules. Money is always stored in cents.

export const CAPACITY = 35; // paid seats per room
export const PLATFORM_PERCENT = 10; // your cut of every entry fee
export const PLACE_SPLITS = [60, 30, 10] as const; // % of the prize pool for 1st / 2nd / 3rd
export const MAX_DAILY_STEPS = 100_000; // sanity cap for one day's steps

export const TIERS = [
  { key: "daily", label: "Daily", feeCents: 500, durationDays: 1 },
  { key: "weekly", label: "Weekly", feeCents: 1000, durationDays: 7 },
  { key: "monthly", label: "Monthly", feeCents: 3000, durationDays: 30 },
  { key: "yearly", label: "Yearly", feeCents: 10000, durationDays: 365 },
] as const;

export type TierKey = (typeof TIERS)[number]["key"];

export function getTier(key: string) {
  return TIERS.find((t) => t.key === key);
}

export function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function operatorCashtag() {
  return (process.env.CASHAPP_CASHTAG ?? "YOUR_CASHTAG").replace(/^\$/, "");
}

/**
 * Splits a room's total entry pool.
 * Platform keeps 10% of the pool; the remaining 90% (prize pool) is split 60/30/10.
 * Any prize that has no eligible winner rolls back to the platform.
 */
export function computeSettlement(poolCents: number) {
  const platformFee = Math.floor((poolCents * PLATFORM_PERCENT) / 100);
  const prizePool = poolCents - platformFee;
  const amounts = PLACE_SPLITS.map((pct) => Math.floor((prizePool * pct) / 100));
  return { poolCents, platformFee, prizePool, amounts };
}
