import Link from "next/link";
import { SparkIcon } from "@/components/icons";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090f]/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/20">
            <SparkIcon className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Staffroom<span className="text-indigo-400">Intel</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <NavLink href="/schools">Schools</NavLink>
          <NavLink href="/purchasing-power">Purchasing Power</NavLink>
          <NavLink href="/about">About</NavLink>
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}
