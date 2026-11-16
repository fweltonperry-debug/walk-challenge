"use client";
import Link from "next/link";
import { calcPrizes, fmtMoney, timeLeft } from "@/lib/prizes";

type Pool = {
  id: number;
  type: string;
  title: string;
  entryFee: number;
  maxParticipants: number;
  startsAt: string;
  endsAt: string;
  status: string;
  participantCount: number;
  verifiedCount: number;
};

const TYPE_STYLE: Record<string, { badge: string; emoji: string }> = {
  daily: { badge: "bg-amber-400 text-black", emoji: "⚡" },
  weekly: { badge: "bg-[#00D632] text-black", emoji: "🔥" },
  monthly: { badge: "bg-white text-black", emoji: "🏆" },
  yearly: { badge: "bg-black text-[#00D632] border border-[#00D632]", emoji: "👑" },
};

export default function PoolCard({ pool }: { pool: Pool }) {
  const prizes = calcPrizes(pool.entryFee, 35, 10);
  const spotsLeft = 35 - pool.participantCount;
  const pct = Math.round((pool.participantCount / 35) * 100);
  const style = TYPE_STYLE[pool.type] || TYPE_STYLE.daily;

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#131813] p-5 hover:border-[#00D632]/50 transition">
      <div className="flex items-start justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${style.badge}`}>
          {style.emoji} {pool.type}
        </span>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/80">{timeLeft(pool.endsAt)} left</span>
      </div>

      <h3 className="mt-3 text-xl font-black text-white">{pool.title}</h3>
      <p className="text-sm text-white/60">35 walkers • Most steps wins • Cash App only</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/40 p-2">
          <div className="text-[11px] uppercase tracking-wide text-white/50">Entry</div>
          <div className="text-lg font-black text-white">{fmtMoney(pool.entryFee)}</div>
        </div>
        <div className="rounded-xl bg-black/40 p-2">
          <div className="text-[11px] uppercase tracking-wide text-white/50">1st Prize</div>
          <div className="text-lg font-black text-[#00D632]">{fmtMoney(prizes.first)}</div>
        </div>
        <div className="rounded-xl bg-black/40 p-2">
          <div className="text-[11px] uppercase tracking-wide text-white/50">Pot (35)</div>
          <div className="text-lg font-black text-white">{fmtMoney(prizes.totalPot)}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-white/70">{pool.participantCount}/35 joined</span>
          <span className={spotsLeft <= 5 ? "text-red-400" : "text-[#00D632]"}>{spotsLeft} spots left</span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#00D632]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-xs text-white/70">
        <span>🥇 60% • 🥈 30% • 🥉 10%</span>
        <span>House 10% • {fmtMoney(prizes.houseCut)}</span>
      </div>

      <Link href={`/pool/${pool.id}`} className="mt-4 block rounded-xl bg-[#00D632] py-3 text-center font-black text-black hover:bg-[#00e63a]">
        {spotsLeft === 0 ? "View Leaderboard" : "Join This Pool →"}
      </Link>
    </div>
  );
}
