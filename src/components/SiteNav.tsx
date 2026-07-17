"use client";

import { useState } from "react";
import Link from "next/link";
import { SparkIcon } from "@/components/icons";
import { AuthButton } from "@/components/AuthButton";
import { CurrencyPicker } from "@/components/CurrencyProvider";

export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07090f]/70 backdrop-blur-xl">
      <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/20 transition group-hover:shadow-indigo-500/40">
            <SparkIcon className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Staffroom<span className="text-indigo-400">Intel</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 text-sm lg:flex">
          <NavLink href="/schools">Schools</NavLink>
          <NavLink href="/compare">Compare</NavLink>
          <NavLink href="/board">Board</NavLink>
          <NavLink href="/purchasing-power">Purchasing Power</NavLink>
          <NavLink href="/submit">Contribute</NavLink>
          <div className="ml-2 flex items-center gap-2 border-l border-white/[0.06] pl-3">
            <CurrencyPicker />
            <AuthButton />
          </div>
        </div>

        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
          >
            <span className="relative h-4 w-5" aria-hidden="true">
              <span className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded bg-current transition ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded bg-current transition ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
          {mobileOpen && (
            <div className="absolute inset-x-4 top-[calc(100%+0.5rem)] rounded-2xl border border-white/10 bg-[#0c0f17]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="grid gap-1 text-sm">
                <MobileNavLink href="/schools" onNavigate={() => setMobileOpen(false)}>Schools</MobileNavLink>
                <MobileNavLink href="/compare" onNavigate={() => setMobileOpen(false)}>Compare</MobileNavLink>
                <MobileNavLink href="/board" onNavigate={() => setMobileOpen(false)}>Board</MobileNavLink>
                <MobileNavLink href="/purchasing-power" onNavigate={() => setMobileOpen(false)}>Purchasing Power</MobileNavLink>
                <MobileNavLink href="/submit" onNavigate={() => setMobileOpen(false)}>Contribute</MobileNavLink>
              </div>
              <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-3">
                <CurrencyPicker />
                <AuthButton />
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-11 items-center rounded-xl px-3 text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </Link>
  );
}
