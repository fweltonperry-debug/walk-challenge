export type PoolType = "daily" | "weekly" | "monthly" | "yearly";

export const POOL_CONFIG: Record<PoolType, { fee: number; label: string; durationLabel: string }> = {
  daily: { fee: 5, label: "Daily", durationLabel: "24 hours" },
  weekly: { fee: 10, label: "Weekly", durationLabel: "7 days" },
  monthly: { fee: 30, label: "Monthly", durationLabel: "30 days" },
  yearly: { fee: 100, label: "Yearly", durationLabel: "365 days" },
};

export function calcPrizes(entryFee: number, participants: number, houseCutPercent = 10) {
  const totalPot = entryFee * participants;
  const houseCut = (totalPot * houseCutPercent) / 100;
  const distributable = totalPot - houseCut;
  const first = distributable * 0.6;
  const second = distributable * 0.3;
  const third = distributable * 0.1;
  return { totalPot, houseCut, distributable, first, second, third };
}

export function fmtMoney(n: number | string) {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return `$${num.toFixed(2)}`;
}

export function fmtSteps(n: number) {
  return n.toLocaleString("en-US");
}

export function timeLeft(endsAt: string | Date) {
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}
