import Link from "next/link";
import { calcPrizes, fmtMoney } from "@/lib/prizes";

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-black">How StepCash Works 👟💰</h1>
      <p className="mt-2 text-white/60">The simplest way to get paid for walking. Cash App only. 35 walkers. Top 3 win.</p>

      <div className="mt-8 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
          <h2 className="text-xl font-black">1. Choose Your Pool</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              { t: "Daily", f: 5, d: "24 hours" },
              { t: "Weekly", f: 10, d: "7 days" },
              { t: "Monthly", f: 30, d: "30 days" },
              { t: "Yearly", f: 100, d: "365 days" },
            ].map(x => (
              <div key={x.t} className="rounded-2xl bg-black/40 p-4 text-center">
                <div className="font-black text-lg">{x.t}</div>
                <div className="text-2xl font-black text-[#00D632]">{fmtMoney(x.f)}</div>
                <div className="text-xs text-white/50">{x.d} • 35 max</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
          <h2 className="text-xl font-black">2. Pay via Cash App</h2>
          <p className="mt-2 text-white/70">Send your entry fee to <b className="text-[#00D632]">$stockhunger</b> on Cash App. Paste your Transaction ID when joining. Admin verifies within minutes. No verification = no steps.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
          <h2 className="text-xl font-black">3. Walk & Log Steps</h2>
          <p className="mt-2 text-white/70">Log your steps from your dashboard. Leaderboard updates live. Most steps at pool end wins. Cheating = banned + forfeit.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
          <h2 className="text-xl font-black">4. Bot Pays Winners Automatically 🤖</h2>
          <p className="mt-2 text-white/70">When the pool ends, our bot ranks everyone, takes the 10% house cut, and auto-sends winnings to each winner&apos;s $cashtag. You don&apos;t chase payments — they come to you.</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#00D632] text-black"><tr><th className="px-4 py-2">Pool</th><th className="px-4 py-2">🥇 1st</th><th className="px-4 py-2">🥈 2nd</th><th className="px-4 py-2">🥉 3rd</th><th className="px-4 py-2">House</th></tr></thead>
              <tbody className="divide-y divide-white/10 bg-black/30">
                {[5,10,30,100].map((f,i) => {
                  const p = calcPrizes(f, 35, 10);
                  const labels = ["Daily","Weekly","Monthly","Yearly"];
                  return <tr key={f}><td className="px-4 py-2 font-bold">{labels[i]}</td><td className="px-4 py-2 font-black text-[#00D632]">{fmtMoney(p.first)}</td><td className="px-4 py-2">{fmtMoney(p.second)}</td><td className="px-4 py-2">{fmtMoney(p.third)}</td><td className="px-4 py-2 text-white/60">{fmtMoney(p.houseCut)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-white/50">Based on full 35-person pools. Smaller pools pay proportionally less.</p>
        </div>

        <Link href="/pools" className="block rounded-2xl bg-[#00D632] py-4 text-center text-lg font-black text-black">Start Walking — Join a Pool →</Link>
      </div>
    </main>
  );
}
