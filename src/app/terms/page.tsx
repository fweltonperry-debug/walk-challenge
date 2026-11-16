export const metadata = { title: "Terms of Service — StepCash" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-black">Terms of Service</h1>
      <p className="mt-2 text-sm text-white/50">Last updated: November 2026</p>
      <div className="mt-8 space-y-6 text-white/80 leading-relaxed">
        <section>
          <h2 className="text-xl font-black text-white">1. Eligibility</h2>
          <p className="mt-2">You must be 18 or older and live somewhere paid skill contests are legal. You are responsible for following your local laws.</p>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">2. How Pools Work</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Entry fees: Daily $5, Weekly $10, Monthly $30, Yearly $100</li>
            <li>Each pool holds up to 35 entrants</li>
            <li>A 10% house fee comes out of each pot</li>
            <li>The rest is split: 1st place 60%, 2nd place 30%, 3rd place 10%</li>
            <li>Winners are the verified entrants with the most steps when the pool ends</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">3. Payments — Cash App Only</h2>
          <p className="mt-2">Entries must be paid through Cash App to $stockhunger. Your entry is active only after your payment is verified. Winnings are sent to the $cashtag on your profile. We are not responsible for winnings sent to a wrong $cashtag that you entered.</p>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">4. Fair Play</h2>
          <p className="mt-2">Steps are read automatically from your phone and connected watch through Android Health Connect in the StepCash app. Steps typed in by hand are not counted. Any day over 50,000 steps is flagged for review, and flagged players can&apos;t win until an admin clears them. Faking steps with shaking devices, step machines, or false data means disqualification with no prize and no refund. Open the app before a pool ends. Steps that haven&apos;t synced within 30 minutes after the pool ends won&apos;t count.</p>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">5. Refunds</h2>
          <p className="mt-2">Entries are non-refundable once a pool starts. If we cancel a pool, every verified entrant gets a full refund.</p>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">6. Changes</h2>
          <p className="mt-2">We may update these terms. If you keep using StepCash after an update, you accept the new terms.</p>
        </section>
      </div>
    </main>
  );
}
