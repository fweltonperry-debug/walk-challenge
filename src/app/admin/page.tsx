"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Tab = "overview" | "payments" | "rooms" | "payouts";

type Overview = {
  rooms: { status: string; count: number }[];
  entries: { status: string; count: number }[];
  paidRevenueCents: number;
  platformEarnedCents: number;
  payouts: { status: string; total: number; count: number }[];
};

type AdminEntry = {
  id: number;
  roomId: number;
  status: string;
  paymentCode: string;
  amountCents: number;
  createdAt: string;
  tier: string;
  roomStatus: string;
  cashtag: string;
  displayName: string;
};

type AdminRoom = {
  id: number;
  tier: string;
  feeCents: number;
  status: string;
  capacity: number;
  startsAt: string | null;
  endsAt: string | null;
  poolCents: number;
  prizePoolCents: number;
  platformCents: number;
  paid: number;
  pending: number;
};

type AdminPayout = {
  id: number;
  roomId: number;
  place: number;
  amountCents: number;
  cashtag: string;
  status: string;
  providerRef: string | null;
  note: string | null;
  tier: string;
  displayName: string;
  createdAt: string;
};

const PW_KEY = "walk_admin_password";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function adminFetch<T>(url: string, password: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", "x-admin-password": password },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem(PW_KEY);
    if (!saved) {
      setChecking(false);
      return;
    }
    fetch("/api/admin/overview", { headers: { "x-admin-password": saved } }).then((res) => {
      if (res.ok) setPassword(saved);
      else sessionStorage.removeItem(PW_KEY);
      setChecking(false);
    });
  }, []);

  if (checking) return <div className="grid min-h-screen place-items-center text-slate-500">Loading...</div>;

  if (!password) {
    return <AdminLogin onLogin={(pw) => setPassword(pw)} />;
  }

  return <AdminPanel password={password} onLogout={() => { sessionStorage.removeItem(PW_KEY); setPassword(null); }} />;
}

function AdminLogin({ onLogin }: { onLogin: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/overview", { headers: { "x-admin-password": pw } });
    setBusy(false);
    if (res.ok) {
      sessionStorage.setItem(PW_KEY, pw);
      onLogin(pw);
    } else {
      setError("Wrong admin password (or ADMIN_PASSWORD is not set on the server).");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-950">Admin login</h1>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Admin password"
          className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          required
        />
        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-full bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? "Checking..." : "Enter"}
        </button>
        <Link href="/" className="mt-4 block text-center text-sm text-slate-500 underline">
          Back to site
        </Link>
      </form>
    </main>
  );
}

function AdminPanel({ password, onLogout }: { password: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const flash = useCallback((msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setNotice("");
    } else {
      setNotice(msg);
      setError("");
    }
  }, []);

  return (
    <main className="min-h-screen pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold">Walk Challenge Admin</span>
            <nav className="flex gap-1 text-sm font-semibold">
              {(["overview", "payments", "rooms", "payouts"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-2 capitalize ${tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {t}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/play" className="text-slate-600 underline">
              Player view
            </Link>
            <button onClick={onLogout} className="rounded-full border border-slate-300 px-3 py-1.5 font-medium">
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 pt-8">
        {notice && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">{notice}</div>}
        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200">{error}</div>}

        {tab === "overview" && <OverviewTab password={password} />}
        {tab === "payments" && <PaymentsTab password={password} flash={flash} />}
        {tab === "rooms" && <RoomsTab password={password} flash={flash} />}
        {tab === "payouts" && <PayoutsTab password={password} flash={flash} />}
      </div>
    </main>
  );
}

function useLoader<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setErr("");
        }
      })
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Failed"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, err, reload: () => setTick((t) => t + 1) };
}

function OverviewTab({ password }: { password: string }) {
  const { data, err } = useLoader<Overview>(() => adminFetch<Overview>("/api/admin/overview", password), [password]);
  if (err) return <p className="text-rose-700">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading...</p>;

  const pending = data.payouts.find((p) => p.status === "pending");
  const cards = [
    { label: "Paid entry revenue", value: money(data.paidRevenueCents) },
    { label: "Your 10% earned (completed rooms)", value: money(data.platformEarnedCents) },
    { label: "Prizes waiting to be paid", value: money(pending?.total ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-2 text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Breakdown title="Rooms" rows={data.rooms.map((r) => [r.status, r.count])} />
        <Breakdown title="Entries" rows={data.entries.map((e) => [e.status, e.count])} />
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.length === 0 && <li className="text-slate-500">None yet.</li>}
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span className="capitalize">{k.replace(/_/g, " ")}</span>
            <span className="font-semibold">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentsTab({ password, flash }: { password: string; flash: (m: string, e?: boolean) => void }) {
  const [filter, setFilter] = useState("open");
  const { data, err, reload } = useLoader<{ entries: AdminEntry[] }>(
    () => adminFetch(`/api/admin/entries?status=${filter}`, password),
    [password, filter],
  );

  async function act(id: number, action: "confirm" | "cancel") {
    try {
      const res = await adminFetch<{ roomActivated?: boolean }>(`/api/admin/entries/${id}`, password, {
        body: { action },
      });
      flash(
        action === "confirm"
          ? res.roomActivated
            ? "Payment confirmed. The room is full and the challenge has started!"
            : "Payment confirmed."
          : "Seat cancelled.",
      );
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", true);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Cash App payments</h2>
          <p className="text-sm text-slate-600">
            Check your Cash App activity for a payment matching the code in the note, then confirm here.
          </p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="open">Needs action</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </div>
      {err && <p className="mt-4 text-rose-700">{err}</p>}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Code</th>
              <th>Player</th>
              <th>Tier / room</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data?.entries.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  Nothing here.
                </td>
              </tr>
            )}
            {data?.entries.map((e) => (
              <tr key={e.id}>
                <td className="py-3 font-mono font-semibold">{e.paymentCode}</td>
                <td>
                  {e.displayName} <span className="text-slate-500">${e.cashtag}</span>
                </td>
                <td className="capitalize">
                  {e.tier} · room #{e.roomId}
                </td>
                <td>{money(e.amountCents)}</td>
                <td className="capitalize">{e.status.replace(/_/g, " ")}</td>
                <td className="space-x-2 text-right">
                  {e.status !== "paid" && e.status !== "refunded" && (
                    <>
                      <button onClick={() => act(e.id, "confirm")} className="rounded-full bg-emerald-500 px-3 py-1.5 font-semibold text-white hover:bg-emerald-600">
                        Confirm paid
                      </button>
                      <button onClick={() => act(e.id, "cancel")} className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50">
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoomsTab({ password, flash }: { password: string; flash: (m: string, e?: boolean) => void }) {
  const { data, err, reload } = useLoader<{ rooms: AdminRoom[] }>(() => adminFetch("/api/admin/rooms", password), [password]);

  async function settleAllDue() {
    try {
      const res = await adminFetch<{ results: { settled: boolean }[] }>("/api/admin/settle", password, { body: {} });
      const count = res.results.filter((r) => r.settled).length;
      flash(count ? `Settled ${count} room(s). Winners added to the payout queue.` : "No rooms have ended yet.");
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", true);
    }
  }

  async function settleNow(roomId: number) {
    if (!confirm(`Settle room #${roomId} now, before its timer ends?`)) return;
    try {
      await adminFetch("/api/admin/settle", password, { body: { roomId } });
      flash(`Room #${roomId} settled.`);
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", true);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Rooms</h2>
          <p className="text-sm text-slate-600">Rooms settle automatically when their timer ends. You can also run it now.</p>
        </div>
        <button onClick={settleAllDue} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Settle all ended rooms
        </button>
      </div>
      {err && <p className="mt-4 text-rose-700">{err}</p>}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Room</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Paid</th>
              <th>Pool</th>
              <th>Prize pool</th>
              <th>Your cut</th>
              <th>Ends</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data?.rooms.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-500">
                  No rooms yet.
                </td>
              </tr>
            )}
            {data?.rooms.map((r) => (
              <tr key={r.id}>
                <td className="py-3 font-semibold">#{r.id}</td>
                <td className="capitalize">{r.tier}</td>
                <td className="capitalize">{r.status}</td>
                <td>
                  {r.paid}/{r.capacity}
                </td>
                <td>{money(r.poolCents || r.paid * r.feeCents)}</td>
                <td>{r.status === "completed" ? money(r.prizePoolCents) : "-"}</td>
                <td>{r.status === "completed" ? money(r.platformCents) : "-"}</td>
                <td>{r.endsAt ? new Date(r.endsAt).toLocaleString() : "-"}</td>
                <td className="text-right">
                  {r.status === "active" && (
                    <button onClick={() => settleNow(r.id)} className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50">
                      Settle now
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PayoutsTab({ password, flash }: { password: string; flash: (m: string, e?: boolean) => void }) {
  const [filter, setFilter] = useState("");
  const { data, err, reload } = useLoader<{ payouts: AdminPayout[]; providerConfigured: boolean }>(
    () => adminFetch(`/api/admin/payouts${filter ? `?status=${filter}` : ""}`, password),
    [password, filter],
  );

  async function action(id: number, act: "send" | "mark_paid" | "mark_failed") {
    let providerRef: string | undefined;
    if (act === "mark_paid") {
      providerRef = prompt("Cash App transaction ID for this payment (optional):") ?? undefined;
    }
    try {
      const res = await adminFetch<{ message?: string }>(`/api/admin/payouts/${id}`, password, {
        body: { action: act, providerRef },
      });
      flash(res.message ?? "Updated.");
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", true);
    }
  }

  async function runBot() {
    try {
      const res = await adminFetch<{ processed: number; providerConfigured: boolean }>("/api/admin/payouts/run", password, {
        body: {},
      });
      flash(
        res.providerConfigured
          ? `Payout bot processed ${res.processed} payout(s).`
          : "No payout provider is configured (PAYOUT_PROVIDER_URL / PAYOUT_PROVIDER_KEY). Send these manually in Cash App and mark them paid.",
      );
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", true);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Prize payouts</h2>
          <p className="text-sm text-slate-600">
            {data?.providerConfigured
              ? "Payout provider connected. The bot can send payouts automatically."
              : "No payout provider connected. Send each prize in Cash App to the winner's $cashtag, then mark it paid."}
          </p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <button onClick={runBot} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
            Run payout bot
          </button>
        </div>
      </div>
      {err && <p className="mt-4 text-rose-700">{err}</p>}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Winner</th>
              <th>Cash App</th>
              <th>Room</th>
              <th>Place</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data?.payouts.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  No payouts yet.
                </td>
              </tr>
            )}
            {data?.payouts.map((p) => (
              <tr key={p.id}>
                <td className="py-3 font-semibold">{p.displayName}</td>
                <td>${p.cashtag}</td>
                <td className="capitalize">
                  {p.tier} #{p.roomId}
                </td>
                <td>{p.place}</td>
                <td className="font-semibold">{money(p.amountCents)}</td>
                <td className="capitalize">{p.status}</td>
                <td className="font-mono text-xs">{p.providerRef ?? "-"}</td>
                <td className="space-x-2 text-right">
                  {p.status !== "paid" && (
                    <>
                      <button onClick={() => action(p.id, "send")} className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50">
                        Send via bot
                      </button>
                      <button onClick={() => action(p.id, "mark_paid")} className="rounded-full bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-700">
                        Mark paid
                      </button>
                      <button onClick={() => action(p.id, "mark_failed")} className="rounded-full px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50">
                        Failed
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
