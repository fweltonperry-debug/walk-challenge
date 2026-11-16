"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PoolCard from "@/components/PoolCard";
import { calcPrizes, fmtMoney } from "@/lib/prizes";

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

export default function HomePage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [calcFee, setCalcFee] = useState(5);
  const [calcPeople, setCalcPeople] = useState(35);

  useEffect(() => {
    fetch("/api/pools")
      .then((r) => r.json())
      .then((d) => { setPools(d.pools || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const prizes = calcPrizes(calcFee, calcPeople, 10);

  return (
    <main>
      {/* HERO */}
      <section className="border-b border-white/10 bg-[#0B0F0C]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00D632]/40 bg-[#00D632]/10 px-3 py-1 text-xs font-bold text-[#00D632]">
                <span className="h-2 w-2 rounded-full bg-[#00D632] animate-pulse" /> LIVE • Cash App Approved • Auto-Payout Bot ON
              </div>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
                Walk. Win.<br />
                <span className="text-[#00D632]">Get Paid.</span>
              </h1>
              <p className="mt-4 max-w-lg text-lg text-white/70">
                35 walkers enter. Whoever walks the most steps wins the pot. Top 3 get paid instantly via <span className="font-bold text-white">Cash App</span>. No scams. No waiting.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pools" className="rounded-full bg-[#00D632] px-6 py-3 font-black text-black hover:bg-[#00e63a]">Enter a Pool — from $5 →</Link>
                <Link href="/how-it-works" className="rounded-full border border-white/20 px-6 py-3 font-bold text-white hover:bg-white/10">How It Works</Link>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                <div className="rounded-2xl bg-[#131813] p-3 text-center border border-white/10">
                  <div className="text-2xl font-black text-[#00D632]">35</div>
                  <div className="text-xs text-white/60">Per Pool Max</div>
                </div>
                <div className="rounded-2xl bg-[#131813] p-3 text-center border border-white/10">
                  <div className="text-2xl font-black text-white">Top 3</div>
                  <div className="text-xs text-white/60">Win the Pot</div>
                </div>
                <div className="rounded-2xl bg-[#131813] p-3 text-center border border-white/10">
                  <div className="text-2xl font-black text-white">10%</div>
                  <div className="text-xs text-white/60">House Cut</div>
                </div>
              </div>
            </div>

            {/* Prize calculator */}
            <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">💰 Prize Calculator</h2>
                <span className="rounded-full bg-[#00D632] px-2 py-0.5 text-xs font-black text-black">LIVE MATH</span>
              </div>
              <p className="mt-1 text-sm text-white/60">See exactly what you can win. House takes 10% first, rest splits 60/30/10.</p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-white/60">Entry Fee</label>
                  <div className="mt-2 flex gap-2">
                    {[5,10,30,100].map((f) => (
                      <button key={f} onClick={() => setCalcFee(f)} className={`flex-1 rounded-xl py-2.5 font-black ${calcFee===f ? "bg-[#00D632] text-black" : "bg-white/10 text-white hover:bg-white/20"}`}>${f}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-white/60">Walkers in Pool: {calcPeople}/35</label>
                  <input type="range" min={3} max={35} value={calcPeople} onChange={(e) => setCalcPeople(parseInt(e.target.value))} className="mt-2 w-full accent-[#00D632]" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/40 p-3">
                  <div className="text-xs text-white/50">Total Pot</div>
                  <div className="text-xl font-black">{fmtMoney(prizes.totalPot)}</div>
                </div>
                <div className="rounded-xl bg-black/40 p-3">
                  <div className="text-xs text-white/50">House (10%)</div>
                  <div className="text-xl font-black text-white/80">{fmtMoney(prizes.houseCut)}</div>
                </div>
                <div className="rounded-xl bg-[#00D632] p-3 text-black">
                  <div className="text-xs font-bold">🥇 1st Place (60%)</div>
                  <div className="text-xl font-black">{fmtMoney(prizes.first)}</div>
                </div>
                <div className="rounded-xl bg-white p-3 text-black">
                  <div className="text-xs font-bold">🥈 2nd Place (30%)</div>
                  <div className="text-xl font-black">{fmtMoney(prizes.second)}</div>
                </div>
                <div className="col-span-2 rounded-xl bg-white/10 p-3 flex justify-between items-center">
                  <span className="text-sm font-bold">🥉 3rd Place (10%)</span>
                  <span className="text-xl font-black">{fmtMoney(prizes.third)}</span>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-white/50">Full 35-person pools pay the max shown above.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE POOLS */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black">🔴 Live Pools</h2>
            <p className="text-white/60">Join before they fill. 35 spots max. First come, first walk.</p>
          </div>
          <Link href="/pools" className="hidden sm:block font-bold text-[#00D632] hover:underline">View all →</Link>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/10" />)}</div>
        ) : pools.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/20 p-10 text-center text-white/60">
            No pools yet. <button onClick={async () => { await fetch("/api/seed", { method: "POST" }); window.location.reload(); }} className="text-[#00D632] font-bold underline">Seed demo pools</button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {pools.map((p) => <PoolCard key={p.id} pool={p} />)}
          </div>
        )}
      </section>

      {/* HOW IT WORKS STRIP */}
      <section className="border-y border-white/10 bg-[#131813]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-3xl font-black">How StepCash Works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {[
              { n: "01", t: "Pick Your Pool", d: "Daily $5 • Weekly $10 • Monthly $30 • Yearly $100. 35 spots only.", e: "🎯" },
              { n: "02", t: "Pay via Cash App", d: "Send entry to $stockhunger. Enter your Tx ID. Admin verifies in minutes.", e: "💵" },
              { n: "03", t: "Walk & Log Steps", d: "Log your steps daily. Leaderboard updates live. Most steps = winning.", e: "👟" },
              { n: "04", t: "Bot Pays Winners", d: "Top 3 get paid automatically via Cash App. 60% / 30% / 10%. House keeps 10%.", e: "🤖" },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-black/30 p-5 border border-white/10">
                <div className="flex justify-between"><span className="text-3xl">{s.e}</span><span className="font-black text-white/20">{s.n}</span></div>
                <h3 className="mt-3 font-black text-lg">{s.t}</h3>
                <p className="mt-1 text-sm text-white/60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIZE TABLE */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-3xl font-black">Full 35-Person Prize Breakdown</h2>
        <p className="text-white/60">This is what winners take home when pools fill. House cut is always 10%.</p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#00D632] text-black">
              <tr>
                <th className="px-4 py-3 font-black">Pool</th>
                <th className="px-4 py-3 font-black">Entry</th>
                <th className="px-4 py-3 font-black">Total Pot</th>
                <th className="px-4 py-3 font-black">🥇 1st (60%)</th>
                <th className="px-4 py-3 font-black">🥈 2nd (30%)</th>
                <th className="px-4 py-3 font-black">🥉 3rd (10%)</th>
                <th className="px-4 py-3 font-black">House 10%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-[#131813]">
              {([5,10,30,100] as const).map((fee, i) => {
                const p = calcPrizes(fee, 35, 10);
                const labels = ["Daily", "Weekly", "Monthly", "Yearly"];
                return (
                  <tr key={fee} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-bold">{labels[i]}</td>
                    <td className="px-4 py-3">{fmtMoney(fee)}</td>
                    <td className="px-4 py-3 font-bold">{fmtMoney(p.totalPot)}</td>
                    <td className="px-4 py-3 font-black text-[#00D632]">{fmtMoney(p.first)}</td>
                    <td className="px-4 py-3">{fmtMoney(p.second)}</td>
                    <td className="px-4 py-3">{fmtMoney(p.third)}</td>
                    <td className="px-4 py-3 text-white/60">{fmtMoney(p.houseCut)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
