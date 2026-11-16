export const metadata = { title: "Privacy Policy — StepCash" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-black">Privacy Policy</h1>
      <p className="mt-2 text-sm text-white/50">Last updated: November 2026</p>
      <div className="mt-8 space-y-6 text-white/80 leading-relaxed">
        <section>
          <h2 className="text-xl font-black text-white">1. What We Collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Username and display name you choose</li>
            <li>Your Cash App $cashtag, which we use only to send your winnings</li>
            <li>The step counts you submit for each pool</li>
            <li>Cash App transaction IDs you give us to verify entry payments</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">2. How We Use It</h2>
          <p className="mt-2">We use your data to run step pools, show leaderboards, verify entry payments, and pay winners. Your display name, $cashtag, and step count appear on public pool leaderboards.</p>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">3. What We Don&apos;t Do</h2>
          <p className="mt-2">We do not sell your data. We never ask for your Cash App password, PIN, card number, or bank details. All payments go through Cash App.</p>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">4. Payments</h2>
          <p className="mt-2">Entry fees are sent by you through Cash App to $stockhunger. Cash App&apos;s own privacy policy covers those transactions. We keep a record of transaction IDs and payout amounts for accounting and dispute resolution.</p>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">5. Data Deletion</h2>
          <p className="mt-2">To delete your account and data, message $stockhunger on Cash App or contact us through the app. We may keep payment records where the law requires it.</p>
        </section>
        <section>
          <h2 className="text-xl font-black text-white">6. Age Requirement</h2>
          <p className="mt-2">StepCash is for users 18 and older. We do not knowingly collect data from minors.</p>
        </section>
      </div>
    </main>
  );
}
