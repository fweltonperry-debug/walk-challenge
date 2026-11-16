import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "StepCash — Walk. Win. Get Paid on Cash App",
  description: "35 walkers. Most steps wins. Daily $5, Weekly $10, Monthly $30, Yearly $100 pools. Top 3 get paid via Cash App.",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "StepCash", statusBarStyle: "black-translucent" },
};

export const viewport = { themeColor: "#00D632" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0B0F0C] text-white antialiased">
        <Navbar />
        {children}
        <footer className="border-t border-white/10 bg-black/40 mt-16">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="grid gap-8 md:grid-cols-4">
              <div>
                <div className="text-xl font-black">STEP<span className="text-[#00D632]">CASH</span></div>
                <p className="mt-2 text-sm text-white/60">The Cash App step challenge. 35 people enter. Top 3 most steps win the pot. Automated payouts.</p>
              </div>
              <div>
                <div className="font-bold text-white">Pools</div>
                <ul className="mt-2 space-y-1 text-sm text-white/60">
                  <li>Daily — $5 entry</li>
                  <li>Weekly — $10 entry</li>
                  <li>Monthly — $30 entry</li>
                  <li>Yearly — $100 entry</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-white">Payouts</div>
                <ul className="mt-2 space-y-1 text-sm text-white/60">
                  <li>🥇 1st — 60% of pot</li>
                  <li>🥈 2nd — 30% of pot</li>
                  <li>🥉 3rd — 10% of pot</li>
                  <li>House cut — 10%</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-white">Cash App Only</div>
                <p className="mt-2 text-sm text-white/60">All entries & payouts via Cash App to <span className="text-[#00D632] font-bold">$stockhunger</span>. Automated bot pays winners instantly.</p>
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-4 text-center text-xs text-white/40">
              <a href="/privacy" className="hover:text-white underline">Privacy Policy</a> • <a href="/terms" className="hover:text-white underline">Terms of Service</a> • 18+ only
              <div className="mt-2">© 2026 StepCash. Walk more. Win more.</div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
