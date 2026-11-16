"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type User = { id: number; username: string; displayName: string; cashTag: string; isAdmin: boolean };

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("stepcash_user");
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0F0C]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00D632] text-xl font-black text-black">👟</div>
          <div>
            <div className="text-lg font-black leading-none tracking-tight text-white">STEP<span className="text-[#00D632]">CASH</span></div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">Walk • Win • Cash App</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-white/70 md:flex">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/pools" className="hover:text-white">Live Pools</Link>
          <Link href="/how-it-works" className="hover:text-white">How It Works</Link>
          <Link href="/dashboard" className="hover:text-white">My Dashboard</Link>
          {user?.isAdmin && <Link href="/admin" className="rounded-full bg-[#00D632] px-3 py-1 text-black">Admin</Link>}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00D632] text-xs font-black text-black">{user.displayName.slice(0,1).toUpperCase()}</span>
              <span className="hidden sm:block">
                <span className="block leading-none font-bold text-white">{user.displayName}</span>
                <span className="block text-[11px] text-[#00D632]">{user.cashTag}</span>
              </span>
            </Link>
          ) : (
            <Link href="/dashboard" className="rounded-full bg-[#00D632] px-4 py-2 text-sm font-black text-black hover:bg-[#00e63a]">Join Now</Link>
          )}
        </div>
      </div>
    </header>
  );
}
