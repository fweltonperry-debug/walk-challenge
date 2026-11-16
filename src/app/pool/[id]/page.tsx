"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { calcPrizes, fmtMoney, fmtSteps, timeLeft } from "@/lib/prizes";

type User = { id: number; username: string; displayName: string; cashTag: string };
type EntryRow = { id: number; poolId: number; userId: number; cashAppTxId: string | null; paymentStatus: string; steps: number; flagged?: boolean; user: User };
type Pool = { id: number; type: string; title: string; entryFee: number; maxParticipants: number; startsAt: string; endsAt: string; status: string };
type Payout = { id: number; place: number; amount: string; cashTag: string; status: string; cashAppTxId: string | null };

export default function PoolDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [pool, setPool] = useState<Pool | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [txId, setTxId] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [myUser, setMyUser] = useState<User | null>(null);

  const load = () => {
    fetch(`/api/pools/${id}`).then(r => r.json()).then(d => {
      setPool(d.pool); setEntries(d.entries || []); setPayouts(d.payouts || []); setLoading(false);
    });
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const raw = localStorage.getItem("stepcash_user");
    if (raw) try { setMyUser(JSON.parse(raw)); } catch {}
  }, []);

  const handleJoin = async () => {
    if (!myUser) { setJoinMsg("Create your profile first on Dashboard →"); return; }
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poolId: parseInt(id), userId: myUser.id, cashAppTxId: txId }),
    });
    const data = await res.json();
    if (res.ok) { setJoinMsg("✅ Entry submitted! Waiting for admin verification."); setShowJoin(false); load(); }
    else setJoinMsg(data.error || "Failed");
  };

  if (loading) return <main className="mx-auto max-w-7xl px-4 py-10"><div className="h-64 animate-pulse rounded-2xl bg-white/10" /></main>;
  if (!pool) return <main className="mx-auto max-w-7xl px-4 py-10 text-white/60">Pool not found</main>;

  const prizes = calcPrizes(pool.entryFee, 35, 10);
  const verified = entries.filter(e => e.paymentStatus === "verified" && !e.flagged);
  const spotsLeft = 35 - entries.length;
  const alreadyJoined = myUser ? entries.some(e => e.userId === myUser.id) : false;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#00D632] px-3 py-1 text-xs font-black uppercase text-black">{pool.type}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{timeLeft(pool.endsAt)} left</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold capitalize">{pool.status}</span>
            </div>
            <h1 className="mt-3 text-3xl font-black">{pool.title}</h1>
            <p className="text-white/60">Ends {new Date(pool.endsAt).toLocaleString()} • 35 walkers • Most steps wins • Cash App only</p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-black/40 p-3 text-center"><div className="text-xs text-white/50">Entry</div><div className="text-xl font-black">{fmtMoney(pool.entryFee)}</div></div>
              <div className="rounded-xl bg-[#00D632] p-3 text-center text-black"><div className="text-xs font-bold">🥇 1st</div><div className="text-xl font-black">{fmtMoney(prizes.first)}</div></div>
              <div className="rounded-xl bg-white p-3 text-center text-black"><div className="text-xs font-bold">🥈 2nd</div><div className="text-xl font-black">{fmtMoney(prizes.second)}</div></div>
              <div className="rounded-xl bg-white/10 p-3 text-center"><div className="text-xs text-white/50">🥉 3rd</div><div className="text-xl font-black">{fmtMoney(prizes.third)}</div></div>
            </div>

            <div className="mt-4 rounded-xl bg-black/30 p-3 text-sm text-white/70 flex justify-between">
              <span>Pot (35): <b className="text-white">{fmtMoney(prizes.totalPot)}</b></span>
              <span>House 10%: <b>{fmtMoney(prizes.houseCut)}</b></span>
              <span>{entries.length}/35 joined • {spotsLeft} left</span>
            </div>

            {!alreadyJoined && spotsLeft > 0 ? (
              <button onClick={() => setShowJoin(!showJoin)} className="mt-5 w-full rounded-xl bg-[#00D632] py-3 font-black text-black hover:bg-[#00e63a]">Join for {fmtMoney(pool.entryFee)} via Cash App →</button>
            ) : alreadyJoined ? (
              <div className="mt-5 rounded-xl bg-[#00D632]/15 border border-[#00D632]/40 p-3 text-center font-bold text-[#00D632]">✅ You&apos;re in! Steps sync automatically from your phone/watch in the StepCash app.</div>
            ) : (
              <div className="mt-5 rounded-xl bg-red-500/15 border border-red-500/40 p-3 text-center font-bold text-red-400">Pool Full (35/35)</div>
            )}

            {showJoin && (
              <div className="mt-4 rounded-2xl border border-[#00D632]/40 bg-black/40 p-5">
                <h3 className="font-black text-lg">💵 Pay via Cash App — 3 Steps</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/80">
                  <li>Open Cash App and send <b className="text-white">{fmtMoney(pool.entryFee)}</b> to <b className="text-[#00D632]">$stockhunger</b></li>
                  <li>Add note: <code className="rounded bg-white/10 px-1">POOL-{pool.id} {myUser?.cashTag || "$YourTag"}</code></li>
                  <li>Paste your Cash App Transaction ID below and submit</li>
                </ol>
                <input value={txId} onChange={e => setTxId(e.target.value)} placeholder="e.g. CA-8X3K9P2Q" className="mt-4 w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3 text-white placeholder:text-white/40" />
                <button onClick={handleJoin} className="mt-3 w-full rounded-xl bg-[#00D632] py-3 font-black text-black">Submit Entry</button>
                {joinMsg && <p className="mt-2 text-sm font-bold text-[#00D632]">{joinMsg}</p>}
                {!myUser && <p className="mt-2 text-sm text-amber-400">⚠️ Create your profile first: go to Dashboard →</p>}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="mt-6 rounded-3xl border border-white/10 bg-[#131813] p-6">
            <h2 className="text-xl font-black">🏆 Live Leaderboard — Most Steps Wins</h2>
            {verified.length === 0 ? (
              <p className="mt-4 text-white/60">No verified walkers yet. Be the first!</p>
            ) : (
              <div className="mt-4 space-y-2">
                {verified.map((e, i) => (
                  <div key={e.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${i===0 ? "bg-[#00D632] text-black" : i===1 ? "bg-white text-black" : i===2 ? "bg-amber-700/40 text-white" : "bg-black/30 text-white"}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 font-black">{i+1}</span>
                      <div>
                        <div className="font-black">{e.user.displayName} {i===0 && "🥇"}{i===1 && "🥈"}{i===2 && "🥉"}</div>
                        <div className={`text-xs ${i<2 ? "text-black/60" : "text-white/50"}`}>{e.user.cashTag}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg">{fmtSteps(e.steps)} steps</div>
                      <div className={`text-xs ${i<2 ? "text-black/60" : "text-white/50"}`}>{i===0 ? fmtMoney(prizes.first) : i===1 ? fmtMoney(prizes.second) : i===2 ? fmtMoney(prizes.third) : "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
            <h3 className="font-black">How Payouts Work</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li>🥇 <b className="text-white">1st place:</b> 60% of distributable pot</li>
              <li>🥈 <b className="text-white">2nd place:</b> 30%</li>
              <li>🥉 <b className="text-white">3rd place:</b> 10%</li>
              <li>🏠 <b className="text-white">House:</b> 10% cut off the top</li>
              <li>🤖 Bot auto-pays winners via Cash App</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#131813] p-6">
            <h3 className="font-black">Payout Status</h3>
            {payouts.length === 0 ? (
              <p className="mt-2 text-sm text-white/60">No payouts yet. Pool still live.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {payouts.map(p => (
                  <div key={p.id} className="rounded-xl bg-black/40 p-3 text-sm">
                    <div className="flex justify-between font-bold"><span>#{p.place} — {p.cashTag}</span><span className="text-[#00D632]">{fmtMoney(p.amount)}</span></div>
                    <div className="text-xs text-white/50">{p.status} {p.cashAppTxId ? `• ${p.cashAppTxId}` : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-[#00D632] p-6 text-black">
            <h3 className="font-black text-lg">Cash App Only 💵</h3>
            <p className="mt-1 text-sm font-semibold">All entries go to $stockhunger. All winnings come back to your $cashtag automatically.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
