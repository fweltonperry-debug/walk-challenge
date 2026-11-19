import Link from "next/link";
import { formatMoney, operatorCashtag, PLACE_SPLITS, PLATFORM_PERCENT, TIERS, CAPACITY } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight">Walk Challenge</span>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/play" className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
            Play now
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-600">
          {CAPACITY}-player step competitions
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1.05] text-slate-950">
          Walk more than the other {CAPACITY - 1} players. Top 3 split the prize pool.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Pay a one-time entry fee with Cash App. Every room fills to {CAPACITY} paid players, runs its
          competition, and the top 3 by steps are paid out automatically.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/play" className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white shadow hover:bg-emerald-600">
            Join a challenge
          </Link>
          <a href="#rules" className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-800 hover:bg-white">
            See the rules
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-bold text-slate-950">Choose your challenge</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div key={tier.key} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{tier.label}</p>
              <p className="mt-2 text-4xl font-bold text-slate-950">{formatMoney(tier.feeCents)}</p>
              <p className="mt-1 text-sm text-slate-600">entry fee</p>
              <ul className="mt-4 space-y-1 text-sm text-slate-700">
                <li>{tier.durationDays} day{tier.durationDays > 1 ? "s" : ""} of competition</li>
                <li>{CAPACITY} players per room</li>
                <li>Top 3 by total steps win</li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="rules" className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-950">How a room works</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-slate-700">
            <li>Create an account with your Cash App $cashtag and a PIN.</li>
            <li>Join a tier. You get a unique payment code.</li>
            <li>
              Send the entry fee to <strong>${operatorCashtag()}</strong> on Cash App and put your code in the note.
            </li>
            <li>When all {CAPACITY} seats are paid, the competition starts automatically.</li>
            <li>Log your steps each day. Highest total steps wins.</li>
          </ol>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-950">Prize split</h2>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li>
              Platform fee: <strong>{PLATFORM_PERCENT}%</strong> of every entry
            </li>
            <li>
              Prize pool: <strong>{100 - PLATFORM_PERCENT}%</strong> of entries, split:
            </li>
            <li className="pl-4">1st place - {PLACE_SPLITS[0]}% of the prize pool</li>
            <li className="pl-4">2nd place - {PLACE_SPLITS[1]}% of the prize pool</li>
            <li className="pl-4">3rd place - {PLACE_SPLITS[2]}% of the prize pool</li>
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Eligibility: 18+ and only where legal in your state or country. Step counts are self-reported.
            Winners are paid to their Cash App $cashtag. This service is not affiliated with or endorsed by
            Cash App or Block, Inc. Check local gambling and sweepstakes laws before running paid contests.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        <p>Walk Challenge. Payments via Cash App only.</p>
        <a
          href="/downloads/walk-challenge-project.zip"
          download
          className="mt-3 inline-block font-semibold text-emerald-700 underline underline-offset-4"
        >
          Download project files (.zip)
        </a>
      </footer>
    </main>
  );
}
