"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { isNativeApp, syncStepsFromPhone } from "@/lib/native-steps";

type User = { id: number; cashtag: string; displayName: string };

type Entry = {
  id: number;
  roomId: number;
  status: string;
  paymentCode: string;
  amountCents: number;
  tier: string;
  roomStatus: string;
  capacity: number;
  startsAt: string | null;
  endsAt: string | null;
  totalSteps: number;
  todaySteps: number | null;
};

type Payout = {
  id: number;
  roomId: number;
  place: number;
  amountCents: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

type Me = { user: User; today: string; entries: Entry[]; payouts: Payout[] };

type Tier = {
  key: string;
  label: string;
  feeCents: number;
  durationDays: number;
  capacity: number;
  filling: { id: number; seats: number; paid: number; capacity: number } | null;
  activeRooms: { id: number; paid: number; capacity: number; startsAt: string | null; endsAt: string | null }[];
};

type Challenges = { tiers: Tier[]; cashtag: string; platformPercent: number; placeSplits: readonly number[] };

type RoomView = {
  room: { id: number; tier: string; status: string; startsAt: string | null; endsAt: string | null; paidSeats: number; capacity: number };
  leaderboard: { rank: number; displayName: string; totalSteps: number; isYou: boolean }[];
  prizes: { place: number; amountCents: number }[];
  winners: { place: number; amountCents: number; status: string; displayName: string }[];
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function dateOnly(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

async function api<T>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  payment_claimed: "Payment being verified",
  paid: "Paid",
  refunded: "Cancelled",
};

export default function PlayPage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [challenges, setChallenges] = useState<Challenges | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [meRes, chRes] = await Promise.all([fetch("/api/me"), fetch("/api/challenges")]);
      setMe(meRes.status === 401 ? null : ((await meRes.json()) as Me));
      setChallenges((await chRes.json()) as Challenges);
    } catch {
      setError("Could not load. Refresh the page.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setNotice("");
    setError("");
    await load();
  }

  if (me === undefined) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Loading...</div>;
  }

  if (me === null) {
    return <AuthScreen onDone={load} />;
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Walk Challenge
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">
            {me.user.displayName} <span className="text-slate-400">${me.user.cashtag}</span>
          </span>
          <button onClick={logout} className="rounded-full border border-slate-300 px-3 py-1.5 font-medium hover:bg-white">
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-6">
        {notice && <Banner tone="ok" text={notice} onClose={() => setNotice("")} />}
        {error && <Banner tone="err" text={error} onClose={() => setError("")} />}

        <section>
          <h2 className="text-2xl font-bold text-slate-950">Join a challenge</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pay the entry fee with Cash App to <strong>${challenges?.cashtag}</strong>. Rooms hold{" "}
            {challenges?.tiers[0]?.capacity ?? 35} paid players. Top 3 by steps win.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(challenges?.tiers ?? []).map((tier) => (
              <TierCard
                key={tier.key}
                tier={tier}
                onJoin={async () => {
                  setError("");
                  try {
                    await api("/api/entries", { body: { tier: tier.key } });
                    setNotice(`Seat reserved in the ${tier.label} challenge. Send the Cash App payment below.`);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not join.");
                  }
                }}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-950">Your challenges</h2>
          {me.entries.length === 0 ? (
            <p className="mt-3 text-slate-600">You have not joined a challenge yet. Pick one above.</p>
          ) : (
            <div className="mt-5 space-y-5">
              {me.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  today={me.today}
                  cashtag={challenges?.cashtag ?? ""}
                  onChanged={load}
                  onNotice={setNotice}
                  onError={setError}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-950">Your prizes</h2>
          {me.payouts.length === 0 ? (
            <p className="mt-3 text-slate-600">No prizes yet. Win a top-3 spot to earn one.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-200 rounded-2xl bg-white ring-1 ring-slate-200">
              {me.payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-4">
                  <span>
                    Place #{p.place} in room {p.roomId}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold">{money(p.amountCents)}</span>
                    <Badge tone={p.status === "paid" ? "green" : "amber"}>{p.status === "paid" ? "Paid to Cash App" : "Processing"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Banner({ tone, text, onClose }: { tone: "ok" | "err"; text: string; onClose: () => void }) {
  const styles = tone === "ok" ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-rose-50 text-rose-900 ring-rose-200";
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 text-sm ring-1 ${styles}`}>
      <span>{text}</span>
      <button onClick={onClose} className="font-semibold opacity-70 hover:opacity-100">
        Dismiss
      </button>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "green" | "amber" | "slate" | "blue" }) {
  const styles = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-200 text-slate-700",
    blue: "bg-sky-100 text-sky-800",
  }[tone];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{children}</span>;
}

function TierCard({ tier, onJoin }: { tier: Tier; onJoin: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const filled = tier.filling?.seats ?? 0;
  const capacity = tier.capacity;
  const pct = Math.min(100, Math.round((filled / capacity) * 100));

  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{tier.label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{money(tier.feeCents)}</p>
      <p className="text-sm text-slate-600">{tier.durationDays} day{tier.durationDays > 1 ? "s" : ""} of steps</p>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Seats taken</span>
          <span>
            {filled}/{capacity}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        {tier.activeRooms.length > 0 && (
          <p className="mt-2 text-xs text-sky-700">{tier.activeRooms.length} room(s) live now</p>
        )}
      </div>

      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onJoin();
          setBusy(false);
        }}
        className="mt-auto pt-6"
      >
        <span className="block rounded-full bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          {busy ? "Reserving..." : `Join for ${money(tier.feeCents)}`}
        </span>
      </button>
    </div>
  );
}

function EntryCard({
  entry,
  today,
  cashtag,
  onChanged,
  onNotice,
  onError,
}: {
  entry: Entry;
  today: string;
  cashtag: string;
  onChanged: () => Promise<void>;
  onNotice: (s: string) => void;
  onError: (s: string) => void;
}) {
  const [logDate, setLogDate] = useState(today);
  const [steps, setSteps] = useState("");
  const [showBoard, setShowBoard] = useState(false);
  const [busy, setBusy] = useState(false);

  const isPaid = entry.status === "paid";
  const isActive = isPaid && entry.roomStatus === "active";
  const isDone = isPaid && entry.roomStatus === "completed";
  const firstDay = dateOnly(entry.startsAt) || today;
  const lastDay = dateOnly(entry.endsAt) || today;
  const maxDay = lastDay < today ? lastDay : today;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            {entry.tier.charAt(0).toUpperCase() + entry.tier.slice(1)} challenge
            <span className="ml-2 text-sm font-normal text-slate-500">Room #{entry.roomId}</span>
          </h3>
          <p className="text-sm text-slate-600">Entry {money(entry.amountCents)} · code {entry.paymentCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={isPaid ? "green" : "amber"}>{STATUS_LABEL[entry.status] ?? entry.status}</Badge>
          {isActive && <Badge tone="blue">Live</Badge>}
          {isDone && <Badge tone="slate">Finished</Badge>}
        </div>
      </div>

      {!isPaid && entry.status !== "refunded" && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p>
            Open Cash App and send <strong>{money(entry.amountCents)}</strong> to <strong>${cashtag}</strong>.
          </p>
          <p className="mt-1">
            Put this exact code in the payment note: <code className="rounded bg-white px-2 py-0.5 font-mono font-bold">{entry.paymentCode}</code>
          </p>
          {entry.status === "awaiting_payment" ? (
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api(`/api/entries/${entry.id}/claim`, { method: "POST" });
                  onNotice("Thanks. We will verify your Cash App payment shortly.");
                  await onChanged();
                })
              }
              className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              I sent the payment
            </button>
          ) : (
            <p className="mt-3 font-medium">Payment received by us, verifying. This can take a short while.</p>
          )}
        </div>
      )}

      {isPaid && entry.roomStatus === "filling" && (
        <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
          You are paid in. The challenge starts automatically once all {entry.capacity} seats are paid.
        </p>
      )}

      {isActive && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600">
            Competition runs {firstDay} to {lastDay}. Your total: <strong className="text-slate-900">{entry.totalSteps.toLocaleString()} steps</strong>
          </p>
          {isNativeApp() && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const count = await syncStepsFromPhone(logDate);
                    await api("/api/steps", { body: { entryId: entry.id, date: logDate, steps: count } });
                    onNotice(`Synced ${count.toLocaleString()} steps from your phone for ${logDate}.`);
                    await onChanged();
                  })
                }
                className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {busy ? "Syncing..." : "Sync steps from phone"}
              </button>
              <p className="text-xs text-emerald-900">
                Reads steps from Health Connect (phone/watch) for the day selected below. No typing needed.
              </p>
            </div>
          )}
          <form
            className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              run(async () => {
                const count = Number(steps);
                await api("/api/steps", { body: { entryId: entry.id, date: logDate, steps: count } });
                onNotice(`Saved ${count.toLocaleString()} steps for ${logDate}.`);
                setSteps("");
                await onChanged();
              });
            }}
          >
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600">Day</span>
              <input
                type="date"
                value={logDate}
                min={firstDay}
                max={maxDay}
                onChange={(e) => setLogDate(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600">Steps that day</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                required
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="e.g. 8500"
                className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button disabled={busy} className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
              {busy ? "Saving..." : "Save steps"}
            </button>
            <p className="w-full text-xs text-slate-500">
              Logging the same day again replaces that day&apos;s number. Today: {entry.todaySteps ?? "not logged"}.
            </p>
          </form>
        </div>
      )}

      {isPaid && (
        <div className="mt-4">
          <button onClick={() => setShowBoard((v) => !v)} className="text-sm font-semibold text-slate-700 underline underline-offset-4">
            {showBoard ? "Hide leaderboard" : "Show leaderboard & prizes"}
          </button>
          {showBoard && <Leaderboard roomId={entry.roomId} />}
        </div>
      )}
    </div>
  );
}

function Leaderboard({ roomId }: { roomId: number }) {
  const [data, setData] = useState<RoomView | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<RoomView>(`/api/rooms/${roomId}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Failed to load"));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (err) return <p className="mt-3 text-sm text-rose-700">{err}</p>;
  if (!data) return <p className="mt-3 text-sm text-slate-500">Loading leaderboard...</p>;

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.4fr]">
      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prizes</p>
        <ul className="mt-2 space-y-2 text-sm">
          {data.prizes.map((p) => (
            <li key={p.place} className="flex justify-between">
              <span>{p.place === 1 ? "1st" : p.place === 2 ? "2nd" : "3rd"} place</span>
              <span className="font-semibold">{money(p.amountCents)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          {data.room.paidSeats}/{data.room.capacity} paid players
        </p>
      </div>
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Player</th>
              <th className="px-4 py-2 text-right">Steps</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-slate-500">
                  No players yet.
                </td>
              </tr>
            )}
            {data.leaderboard.map((row) => (
              <tr key={row.rank} className={row.isYou ? "bg-emerald-50 font-semibold" : "bg-white"}>
                <td className="px-4 py-2">{row.rank}</td>
                <td className="px-4 py-2">
                  {row.displayName}
                  {row.isYou && <span className="ml-2 text-xs text-emerald-700">(you)</span>}
                </td>
                <td className="px-4 py-2 text-right">{row.totalSteps.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.winners.length > 0 && (
          <p className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
            Winners: {data.winners.map((w) => `#${w.place} ${w.displayName} (${money(w.amountCents)})`).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onDone }: { onDone: () => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [cashtag, setCashtag] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        body: mode === "register" ? { cashtag, displayName, pin, dateOfBirth } : { cashtag, pin },
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_24px_60px_rgba(16,24,40,0.12)] ring-1 ring-slate-200">
        <Link href="/" className="text-sm font-semibold text-emerald-600">
          &larr; Walk Challenge
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">
          {mode === "register" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">Your Cash App $cashtag is how we pay you prizes.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Cash App $cashtag
            <input
              required
              value={cashtag}
              onChange={(e) => setCashtag(e.target.value)}
              placeholder="$yourcashtag"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          {mode === "register" && (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Display name
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How others see you"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Date of birth
                <input
                  required
                  type="date"
                  value={dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  You must be 18 or older to join.
                </span>
              </label>
            </>
          )}
          <label className="block text-sm font-medium text-slate-700">
            4-6 digit PIN
            <input
              required
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 tracking-widest"
            />
          </label>

          {error && <p className="text-sm text-rose-700">{error}</p>}

          <button disabled={busy} className="w-full rounded-full bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            {busy ? "Please wait..." : mode === "register" ? "Create account" : "Log in"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError("");
          }}
          className="mt-5 w-full text-center text-sm font-semibold text-slate-700 underline underline-offset-4"
        >
          {mode === "register" ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </div>
    </main>
  );
}
