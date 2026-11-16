"use client";
import { useEffect, useState, useRef } from "react";
import { fmtMoney } from "@/lib/prizes";

type Pool = { id: number; type: string; title: string; entryFee: number; status: string; endsAt: string };
type Pending = { entry: any; user: any; pool: any };
type Payout = { id: number; poolId: number; place: number; amount: string; cashTag: string; status: string; cashAppTxId: string | null };
type Log = { id: number; level: string; message: string; createdAt: string };
type BotStatus = { botEnabled: boolean; lastRun: string; houseTag: string; queuedCount: number; paidTodayCount: number; paidTodayTotal: string; houseRevenue: number };

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [bot, setBot] = useState<BotStatus | null>(null);
  const [botLogs, setBotLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [houseTag, setHouseTag] = useState("");
  const [newType, setNewType] = useState("daily");
  const [newTitle, setNewTitle] = useState("");
  const [newFee, setNewFee] = useState("5");
  const [newDays, setNewDays] = useState("1");
  const [msg, setMsg] = useState("");
  const [botMsg, setBotMsg] = useState("");
  const [running, setRunning] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const intervalRef = useRef<any>(null);

  const load = () => {
    fetch("/api/admin").then(r => r.json()).then(d => { setData(d); setHouseTag(d.houseCashtag || ""); setLoading(false); });
    fetch("/api/bot").then(r => r.json()).then(d => { setBot(d); setBotLogs(d.logs || []); });
  };

  useEffect(() => { load(); }, []);

  // Auto bot tick every 30s when autoMode on
  useEffect(() => {
    if (autoMode) {
      intervalRef.current = setInterval(async () => {
        try {
          await fetch("/api/bot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "tick" }) });
          load();
        } catch {}
      }, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoMode]);

  const act = async (action: string, extra: any = {}) => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const d = await res.json();
    setMsg(res.ok ? "✅ Done!" : (d.error || "Failed"));
    load();
  };

  const runBotTick = async () => {
    setRunning(true);
    setBotMsg("🤖 Bot running...");
    const res = await fetch("/api/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tick" }),
    });
    const d = await res.json();
    setBotMsg(res.ok ? `✅ Bot done: closed ${d.closedCount} pools, paid ${d.paidCount} winners ($${Number(d.paidTotal || 0).toFixed(2)})` : (d.reason === "bot_disabled" ? "⚠️ Bot is OFF — turn it ON first" : "Failed"));
    setRunning(false);
    load();
  };

  const toggleBot = async () => {
    const enabled = !(bot?.botEnabled ?? data?.botEnabled);
    await fetch("/api/bot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", enabled }) });
    load();
  };

  if (loading) return <main className="mx-auto max-w-7xl px-4 py-10"><div className="h-64 animate-pulse rounded-2xl bg-white/10" /></main>;

  const botOn = bot?.botEnabled ?? data?.botEnabled;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">🤖 Payout Bot Control Center</h1>
          <p className="text-white/60">Fully automatic: closes pools → picks top 3 → pays via Cash App. You keep 10%.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleBot} className={`rounded-full px-4 py-2 font-black ${botOn ? "bg-[#00D632] text-black" : "bg-white/15 text-white"}`}>
            Bot: {botOn ? "ON 🟢" : "OFF 🔴"}
          </button>
          <button onClick={() => setAutoMode(!autoMode)} className={`rounded-full px-4 py-2 font-black ${autoMode ? "bg-white text-black" : "bg-white/15 text-white"}`}>
            Auto-Run: {autoMode ? "ON" : "OFF"}
          </button>
          <button onClick={runBotTick} disabled={running} className="rounded-full bg-[#00D632] px-4 py-2 font-black text-black disabled:opacity-50">
            {running ? "⏳ Running..." : "▶ Run Bot Now"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-3 font-bold text-[#00D632]">{msg}</p>}
      {botMsg && <p className="mt-1 font-bold text-white">{botMsg}</p>}

      {/* BOT STATUS */}
      <div className="mt-6 rounded-3xl border border-[#00D632]/40 bg-[#131813] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${botOn ? "bg-[#00D632] animate-pulse" : "bg-red-500"}`} />
            Auto-Payout Bot — {botOn ? "LIVE" : "PAUSED"}
          </h2>
          <span className="text-xs text-white/50">Checks every 30s • Last run: {bot?.lastRun ? new Date(bot.lastRun).toLocaleString() : "never"}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-black/40 p-4 text-center">
            <div className="text-xs text-white/50 uppercase">Queued</div>
            <div className="text-2xl font-black text-amber-400">{bot?.queuedCount ?? 0}</div>
          </div>
          <div className="rounded-xl bg-black/40 p-4 text-center">
            <div className="text-xs text-white/50 uppercase">Paid Today</div>
            <div className="text-2xl font-black text-[#00D632]">{bot?.paidTodayCount ?? 0}</div>
          </div>
          <div className="rounded-xl bg-black/40 p-4 text-center">
            <div className="text-xs text-white/50 uppercase">Paid $ Today</div>
            <div className="text-2xl font-black">{fmtMoney(bot?.paidTodayTotal || "0")}</div>
          </div>
          <div className="rounded-xl bg-[#00D632] p-4 text-center text-black">
            <div className="text-xs font-bold uppercase">Your 10% Cut</div>
            <div className="text-2xl font-black">{fmtMoney(bot?.houseRevenue || data?.houseRevenue || 0)}</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-black/50 p-4 text-sm text-white/70">
          <b className="text-white">How the bot works:</b> When a pool&apos;s timer ends → bot ranks verified walkers by steps → takes 10% house cut → queues 🥇 60% / 🥈 30% / 🥉 10% → sends each winner&apos;s $cashtag via Cash App → logs Tx ID. No manual work.
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-[#00D632] p-5 text-black">
          <div className="text-xs font-bold uppercase">House Revenue (10%)</div>
          <div className="text-3xl font-black">{fmtMoney(data.houseRevenue || 0)}</div>
          <div className="text-xs font-semibold">From verified entries</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#131813] p-5">
          <div className="text-xs text-white/50 uppercase">Total Users</div>
          <div className="text-3xl font-black">{data.totalUsers}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#131813] p-5">
          <div className="text-xs text-white/50 uppercase">Pending Verifications</div>
          <div className="text-3xl font-black text-amber-400">{data.pending?.length || 0}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#131813] p-5">
          <div className="text-xs text-white/50 uppercase">Payouts Queued</div>
          <div className="text-3xl font-black">{(data.payouts || []).filter((p: Payout) => p.status === "queued").length}</div>
        </div>
      </div>

      {(data.flagged || []).length > 0 && (
        <div className="mt-8 rounded-3xl border border-red-500/50 bg-[#1a1111] p-6">
          <h2 className="text-xl font-black">🚩 Flagged for Cheating ({data.flagged.length})</h2>
          <p className="text-sm text-white/60">These players can&apos;t win until you clear them. Ask for a Health Connect / Samsung Health screenshot first.</p>
          <div className="mt-4 space-y-3">
            {data.flagged.map((f: Pending) => (
              <div key={f.entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/40 p-4">
                <div>
                  <div className="font-black">{f.user?.displayName} <span className="text-[#00D632]">{f.user?.cashTag}</span></div>
                  <div className="text-sm text-white/60">{f.pool?.title} • {Number(f.entry.steps).toLocaleString()} steps</div>
                  <div className="text-xs text-red-400">{f.entry.flagReason}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act("clearFlag", { entryId: f.entry.id })} className="rounded-lg bg-[#00D632] px-3 py-1.5 text-sm font-black text-black">✓ Clear</button>
                  <button onClick={() => act("disqualify", { entryId: f.entry.id })} className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-black text-white">✕ Disqualify</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
          <h2 className="text-xl font-black">⏳ Pending Cash App Verifications</h2>
          {(data.pending || []).length === 0 ? (
            <p className="mt-3 text-white/60">All caught up! No pending payments.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.pending.map((p: Pending) => (
                <div key={p.entry.id} className="rounded-xl bg-black/40 p-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-black">{p.user?.displayName} <span className="text-[#00D632]">{p.user?.cashTag}</span></div>
                      <div className="text-sm text-white/60">{p.pool?.title} • {fmtMoney(p.pool?.entryFee || 0)}</div>
                      <div className="text-xs text-white/50">Tx: {p.entry.cashAppTxId || "—"}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => act("verify", { entryId: p.entry.id, status: "verified" })} className="h-fit rounded-lg bg-[#00D632] px-3 py-1.5 text-sm font-black text-black">✓ Verify</button>
                      <button onClick={() => act("verify", { entryId: p.entry.id, status: "rejected" })} className="h-fit rounded-lg bg-red-500 px-3 py-1.5 text-sm font-black text-white">✕ Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
          <h2 className="text-xl font-black">🏆 Pools — Manual Close</h2>
          <p className="text-xs text-white/50">Bot auto-closes when timer ends. Use this to close early.</p>
          <div className="mt-4 space-y-3">
            {(data.pools || []).map((p: Pool) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-black/40 p-4">
                <div>
                  <div className="font-black">{p.title}</div>
                  <div className="text-xs text-white/50 capitalize">{p.type} • {fmtMoney(p.entryFee)} • {p.status} • ends {new Date(p.endsAt).toLocaleString()}</div>
                </div>
                {p.status !== "paid" && (
                  <button onClick={() => act("closeAndQueue", { poolId: p.id })} className="rounded-lg bg-white px-3 py-1.5 text-sm font-black text-black">Close & Queue</button>
                )}
              </div>
            ))}
          </div>

          <h3 className="mt-6 font-black">➕ Create New Pool</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select value={newType} onChange={e => setNewType(e.target.value)} className="rounded-xl border border-white/20 bg-black/50 px-3 py-2.5">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
            </select>
            <input value={newFee} onChange={e => setNewFee(e.target.value)} placeholder="Fee $" className="rounded-xl border border-white/20 bg-black/50 px-3 py-2.5" />
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" className="col-span-2 rounded-xl border border-white/20 bg-black/50 px-3 py-2.5" />
            <input value={newDays} onChange={e => setNewDays(e.target.value)} placeholder="Ends in (days)" className="rounded-xl border border-white/20 bg-black/50 px-3 py-2.5" />
            <button onClick={() => act("createPool", { type: newType, title: newTitle, entryFee: parseFloat(newFee), endsAt: new Date(Date.now() + parseFloat(newDays)*86400000).toISOString() })} className="rounded-xl bg-[#00D632] font-black text-black">Create</button>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-[#131813] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">💸 Payout Queue — Cash App Auto-Pay</h2>
          <button onClick={runBotTick} className="rounded-full bg-[#00D632] px-4 py-2 text-sm font-black text-black">Pay All Queued →</button>
        </div>
        {(data.payouts || []).length === 0 ? (
          <p className="mt-3 text-white/60">No payouts yet. Bot will queue winners when pools end.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/50 text-white/60"><tr><th className="px-4 py-2">Pool</th><th className="px-4 py-2">Place</th><th className="px-4 py-2">Winner</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Tx ID</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {data.payouts.map((p: Payout) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">#{p.poolId}</td>
                    <td className="px-4 py-2 font-black">{p.place === 1 ? "🥇" : p.place === 2 ? "🥈" : "🥉"} #{p.place}</td>
                    <td className="px-4 py-2 text-[#00D632] font-bold">{p.cashTag}</td>
                    <td className="px-4 py-2 font-black">{fmtMoney(p.amount)}</td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-black ${p.status==="paid" ? "bg-[#00D632] text-black" : "bg-amber-400 text-black"}`}>{p.status.toUpperCase()}</span></td>
                    <td className="px-4 py-2 font-mono text-xs">{p.cashAppTxId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
          <h2 className="text-xl font-black">⚙️ House Settings</h2>
          <label className="mt-4 block text-xs font-bold uppercase text-white/60">House Cash Tag (entries go here, bot pays from here)</label>
          <div className="mt-2 flex gap-2">
            <input value={houseTag} onChange={e => setHouseTag(e.target.value)} className="flex-1 rounded-xl border border-white/20 bg-black/50 px-4 py-2.5" />
            <button onClick={() => act("setHouseTag", { value: houseTag })} className="rounded-xl bg-[#00D632] px-4 font-black text-black">Save</button>
          </div>
          <div className="mt-4 rounded-xl bg-black/40 p-4 text-sm text-white/70">
            <b className="text-white">Connect real Cash App:</b> This bot simulates Cash App sends with Tx IDs. To send real money, connect your Cash App Business API key here in production — the payout logic (60/30/10 + 10% cut) is already correct, just swap the simulated send for the real API call.
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
          <h2 className="text-xl font-black">📜 Bot Logs (live)</h2>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {(botLogs.length ? botLogs : (data.logs || [])).map((l: Log) => (
              <div key={l.id} className="rounded-lg bg-black/40 px-3 py-2 text-xs">
                <span className={`font-black ${l.level==="success" ? "text-[#00D632]" : l.level==="warn" ? "text-amber-400" : l.level==="error" ? "text-red-400" : "text-white/60"}`}>{new Date(l.createdAt).toLocaleTimeString()}</span>{" "}
                <span className="text-white/80">{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
