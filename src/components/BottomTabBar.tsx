"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Explore", href: "/", icon: "🏠" },
  { label: "Schools", href: "/schools", icon: "🏫" },
  { label: "Insights", href: "/insights", icon: "📊" },
  { label: "Compare", href: "/compare", icon: "⚖️" },
  { label: "Account", href: "/account", icon: "👤" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#07090f]/90 p-2 backdrop-blur-2xl md:hidden">
      <nav className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition ${
                isActive
                  ? "bg-indigo-500/15 text-indigo-300 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
