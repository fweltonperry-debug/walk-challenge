"use client";
import { useEffect, useState } from "react";
import PoolCard from "@/components/PoolCard";

type Pool = {
  id: number; type: string; title: string; entryFee: number; maxParticipants: number;
  startsAt: string; endsAt: string; status: string; participantCount: number; verifiedCount: number;
};

export default function PoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pools").then(r => r.json()).then(d => { setPools(d.pools || []); setLoading(false); });
  }, []);

  const filtered = filter === "all" ? pools : pools.filter(p => p.type === filter);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-black">Live Pools</h1>
      <p className="mt-1 text-white/60">All pools are 35 walkers max. Cash App only. Top 3 most steps win.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {["all","daily","weekly","monthly","yearly"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${filter===f ? "bg-[#00D632] text-black" : "bg-white/10 text-white hover:bg-white/20"}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/10" />)}</div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {filtered.map(p => <PoolCard key={p.id} pool={p} />)}
        </div>
      )}
    </main>
  );
}
