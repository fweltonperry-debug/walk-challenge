"use client";
import { useState } from "react";
import Link from "next/link";

export default function SetupPage() {
  const [key, setKey] = useState("");
  const [dob, setDob] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  const run = async () => {
    setMsg("Setting up...");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, adminBirthDate: dob }),
    });
    const d = await res.json();
    if (res.ok) { setDone(true); setMsg(""); } else setMsg(d.error || "Failed");
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-3xl border border-white/10 bg-[#131813] p-8">
        <h1 className="text-3xl font-black">🚀 Launch Setup</h1>
        <p className="mt-2 text-white/60">Run this once on your live site. It creates your admin account and the 4 pools (Daily, Weekly, Monthly, Yearly).</p>
        {done ? (
          <div className="mt-6 rounded-xl bg-[#00D632] p-4 font-bold text-black">
            ✅ Done! Go to the <Link href="/dashboard" className="underline">Dashboard</Link> and log in with username <b>admin</b>, cashtag <b>$stockhunger</b> and the date of birth you entered.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60">Setup Key (the SETUP_KEY you set in Vercel)</label>
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-white/60">Your Date of Birth (admin login)</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3 [color-scheme:dark]" />
            </div>
            <button onClick={run} className="w-full rounded-xl bg-[#00D632] py-3 font-black text-black">Set Up StepCash</button>
            {msg && <p className="text-center font-bold text-red-400">{msg}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
