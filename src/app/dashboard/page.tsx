"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fmtMoney, fmtSteps, timeLeft } from "@/lib/prizes";
import { ageFromBirthDate, MIN_AGE } from "@/lib/age";
import {
  getHealthStatus,
  requestStepPermission,
  openHealthConnectInstall,
  openHealthConnectSettings,
  readSteps,
  type HealthStatus,
} from "@/lib/health-sync";

type User = {
  id: number; username: string; displayName: string; cashTag: string; isAdmin: boolean;
  totalSteps: number; totalEarnings: string; birthDate: string | null;
};
type MyEntry = {
  id: number; poolId: number; steps: number; paymentStatus: string; joinedAt: string;
  lastSyncAt: string | null; flagged: boolean; flagReason: string | null; manualStepsBlocked: number;
  pool: { id: number; title: string; entryFee: number; startsAt: string; endsAt: string; status: string } | null;
};

const SYNC_EVERY_MS = 5 * 60 * 1000;

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<MyEntry[]>([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [cashTag, setCashTag] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState("");
  const [health, setHealth] = useState<HealthStatus | "checking">("checking");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const loadEntries = useCallback(async (uid: number) => {
    const d = await fetch(`/api/entries?userId=${uid}`).then((r) => r.json());
    const list: MyEntry[] = d.entries || [];
    setEntries(list);
    return list;
  }, []);

  const refreshUser = useCallback(async (uid: number) => {
    const d = await fetch(`/api/users?id=${uid}`).then((r) => r.json());
    if (d.user) {
      setUser(d.user);
      localStorage.setItem("stepcash_user", JSON.stringify(d.user));
    }
  }, []);

  const syncAll = useCallback(async (u: User, list: MyEntry[]) => {
    const active = list.filter(
      (e) => e.paymentStatus === "verified" && e.pool && e.pool.status === "open"
    );
    if (active.length === 0) { setSyncMsg("No active pools to sync."); return; }
    setSyncing(true);
    setSyncMsg("📲 Reading steps from your phone & watch...");
    let ok = 0;
    let lastErr = "";
    for (const e of active) {
      try {
        const start = new Date(Math.max(new Date(e.pool!.startsAt).getTime(), new Date(e.joinedAt).getTime()));
        const end = new Date(Math.min(new Date(e.pool!.endsAt).getTime(), Date.now()));
        const reading = await readSteps(start, end);
        const res = await fetch("/api/steps/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: u.id, entryId: e.id, ...reading, source: "health_connect" }),
        });
        const data = await res.json();
        if (res.ok) ok++; else lastErr = data.error || "Sync failed";
      } catch (err) {
        lastErr = (err as Error).message;
      }
    }
    await loadEntries(u.id);
    await refreshUser(u.id);
    setSyncing(false);
    setSyncMsg(ok > 0 ? `✅ Synced ${ok} pool${ok > 1 ? "s" : ""} at ${new Date().toLocaleTimeString()}` : `⚠️ ${lastErr}`);
  }, [loadEntries, refreshUser]);

  // Initial load
  useEffect(() => {
    const raw = localStorage.getItem("stepcash_user");
    if (raw) {
      try {
        const u = JSON.parse(raw) as User;
        setUser(u);
        refreshUser(u.id);
        loadEntries(u.id);
      } catch {}
    }
    getHealthStatus().then(setHealth).catch(() => setHealth("not-native"));
  }, [loadEntries, refreshUser]);

  // Auto-sync when ready, then every 5 minutes while the app is open
  useEffect(() => {
    if (health !== "ready" || !user) return;
    let cancelled = false;
    const run = async () => {
      const list = await loadEntries(user.id);
      if (!cancelled) await syncAll(user, list);
    };
    run();
    const t = setInterval(run, SYNC_EVERY_MS);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health, user?.id]);

  const handleSignup = async () => {
    setMsg("");
    if (!username || !cashTag) { setMsg("Username + Cash Tag required"); return; }
    const age = ageFromBirthDate(birthDate);
    if (age === null) { setMsg("Enter your date of birth"); return; }
    if (age < MIN_AGE) { setMsg(`Sorry — you must be ${MIN_AGE} or older to use StepCash.`); return; }
    if (!agree) { setMsg("Please agree to the Terms of Service"); return; }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: displayName || username, cashTag, birthDate, agreeTerms: agree }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("stepcash_user", JSON.stringify(data.user));
      setUser(data.user);
      loadEntries(data.user.id);
      setMsg("");
    } else setMsg(data.error || "Failed");
  };

  const connectHealth = async () => {
    if (health === "not-installed") { await openHealthConnectInstall(); return; }
    const granted = await requestStepPermission();
    if (granted) setHealth("ready");
    else { setSyncMsg("Permission not granted. Opening Health Connect settings..."); await openHealthConnectSettings(); }
  };

  // ---------- SIGN UP ----------
  if (!user || !user.birthDate) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-[#131813] p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black">Join StepCash 👟</h1>
            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black">18+ ONLY</span>
          </div>
          <p className="mt-2 text-white/60">Create your walker profile. Winnings go to your Cash App $cashtag.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-white/60">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. mike_runs" className="mt-1 w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-white/60">Display Name</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Mike R." className="mt-1 w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-white/60">Cash App $cashtag</label>
              <input value={cashTag} onChange={(e) => setCashTag(e.target.value)} placeholder="$YourCashTag" className="mt-1 w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-white/60">Date of Birth</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3 [color-scheme:dark]" />
              <p className="mt-1 text-xs text-white/50">You must be 18 or older. This can&apos;t be changed later.</p>
            </div>
            <label className="flex items-start gap-3 rounded-xl bg-black/40 p-3 text-sm text-white/80">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[#00D632]" />
              <span>I&apos;m 18 or older and I agree to the <Link href="/terms" className="text-[#00D632] underline">Terms</Link> and <Link href="/privacy" className="text-[#00D632] underline">Privacy Policy</Link>.</span>
            </label>
            <button onClick={handleSignup} className="w-full rounded-xl bg-[#00D632] py-3 font-black text-black">Create Profile →</button>
            {msg && <p className="text-center font-bold text-red-400">{msg}</p>}
          </div>
        </div>
      </main>
    );
  }

  // ---------- DASHBOARD ----------
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Hey, {user.displayName} 👋</h1>
          <p className="text-white/60">{user.cashTag} • @{user.username}</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#131813] px-5 py-3 text-center">
            <div className="text-2xl font-black text-[#00D632]">{fmtSteps(user.totalSteps || 0)}</div>
            <div className="text-xs text-white/50">Total Steps</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#131813] px-5 py-3 text-center">
            <div className="text-2xl font-black">{fmtMoney(user.totalEarnings || "0")}</div>
            <div className="text-xs text-white/50">Total Won</div>
          </div>
          {user.isAdmin && <Link href="/admin" className="flex items-center rounded-2xl bg-[#00D632] px-5 py-3 font-black text-black">Admin →</Link>}
        </div>
      </div>

      {/* STEP TRACKING PANEL */}
      <div className="mt-6 rounded-3xl border border-[#00D632]/40 bg-[#131813] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">⌚ Phone & Watch Step Tracking</h2>
            <p className="text-sm text-white/60">Steps sync automatically from Health Connect: your phone, Galaxy Watch, Pixel Watch, Fitbit and more.</p>
          </div>
          {health === "ready" && (
            <button onClick={() => syncAll(user, entries)} disabled={syncing} className="rounded-full bg-[#00D632] px-5 py-2 font-black text-black disabled:opacity-50">
              {syncing ? "⏳ Syncing..." : "🔄 Sync Now"}
            </button>
          )}
        </div>

        <div className="mt-4">
          {health === "checking" && <p className="text-white/60">Checking your device...</p>}
          {health === "not-native" && (
            <div className="rounded-xl bg-black/40 p-4">
              <p className="font-bold">📱 Steps can only be tracked in the StepCash Android app.</p>
              <p className="mt-1 text-sm text-white/60">Browsers can&apos;t read your step count. Install the StepCash app on your Android phone. It reads steps from your phone and watch automatically. Typing in steps is turned off to stop cheating.</p>
            </div>
          )}
          {health === "not-installed" && (
            <div className="rounded-xl bg-black/40 p-4">
              <p className="font-bold">Health Connect is needed</p>
              <p className="mt-1 text-sm text-white/60">Health Connect is Google&apos;s free app that collects steps from your phone and watch.</p>
              <button onClick={connectHealth} className="mt-3 rounded-xl bg-[#00D632] px-4 py-2 font-black text-black">Install Health Connect</button>
            </div>
          )}
          {health === "no-permission" && (
            <div className="rounded-xl bg-black/40 p-4">
              <p className="font-bold">Allow StepCash to read your steps</p>
              <p className="mt-1 text-sm text-white/60">We only read step counts, nothing else.</p>
              <button onClick={connectHealth} className="mt-3 rounded-xl bg-[#00D632] px-4 py-2 font-black text-black">Connect Steps</button>
            </div>
          )}
          {health === "ready" && (
            <p className="text-sm text-[#00D632] font-bold">🟢 Connected. Auto-syncs every 5 minutes while the app is open. Open the app before each pool ends so your final steps count.</p>
          )}
          {syncMsg && <p className="mt-2 text-sm font-bold text-white">{syncMsg}</p>}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-xl font-black">My Pools ({entries.length})</h2>
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-white/60">
              No pools yet. <Link href="/pools" className="font-bold text-[#00D632] underline">Browse live pools →</Link>
            </div>
          ) : entries.map((e) => (
            <div key={e.id} className="rounded-2xl border border-white/10 bg-[#131813] p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="text-lg font-black">{e.pool?.title || `Pool #${e.poolId}`}</div>
                  <div className="text-sm text-white/60">{e.pool ? `${fmtMoney(e.pool.entryFee)} entry • ${timeLeft(e.pool.endsAt)} left` : ""}</div>
                </div>
                <div className="flex gap-2">
                  {e.flagged && <span className="h-fit rounded-full bg-red-500 px-3 py-1 text-xs font-black">UNDER REVIEW</span>}
                  <span className={`h-fit rounded-full px-3 py-1 text-xs font-black ${e.paymentStatus === "verified" ? "bg-[#00D632] text-black" : e.paymentStatus === "rejected" ? "bg-red-500 text-white" : "bg-amber-400 text-black"}`}>{e.paymentStatus.toUpperCase()}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-black/40 px-4 py-3">
                <div>
                  <div className="text-sm text-white/60">Your verified steps</div>
                  <div className="text-xs text-white/40">{e.lastSyncAt ? `Last sync ${new Date(e.lastSyncAt).toLocaleString()}` : "Not synced yet"}</div>
                </div>
                <span className="text-2xl font-black text-[#00D632]">{fmtSteps(e.steps)}</span>
              </div>
              {e.manualStepsBlocked > 0 && (
                <p className="mt-2 text-xs text-amber-400">⚠️ {fmtSteps(e.manualStepsBlocked)} hand-typed steps were found in Health Connect and not counted.</p>
              )}
              {e.flagged && <p className="mt-2 text-xs text-red-400">🚩 {e.flagReason || "Flagged for review"}. An admin must clear this before you can win.</p>}
              {e.paymentStatus === "pending" && (
                <p className="mt-3 text-sm text-amber-400">⏳ Waiting for your Cash App payment to $stockhunger to be verified.</p>
              )}
              <Link href={`/pool/${e.poolId}`} className="mt-3 inline-block text-sm font-bold text-[#00D632] hover:underline">View leaderboard →</Link>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-[#00D632] p-6 text-black">
            <h3 className="text-lg font-black">⌚ Using a watch?</h3>
            <p className="mt-1 text-sm font-semibold">Make sure your watch app (Samsung Health, Fitbit, Google Fit, Garmin etc.) is set to share steps with Health Connect. Health Connect combines phone and watch steps without counting any twice.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
            <h3 className="font-black">Your Cash App</h3>
            <div className="mt-2 rounded-xl bg-black/40 p-3 font-mono font-bold text-[#00D632]">{user.cashTag}</div>
            <p className="mt-2 text-xs text-white/50">Winnings are sent here. Keep it correct!</p>
            <button onClick={() => { localStorage.removeItem("stepcash_user"); window.location.reload(); }} className="mt-4 text-sm font-bold text-red-400 hover:underline">Log out</button>
          </div>
        </div>
      </div>
    </main>
  );
}
