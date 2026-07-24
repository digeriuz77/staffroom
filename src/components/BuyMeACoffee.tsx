"use client";

import { useState } from "react";
import Image from "next/image";

export function BuyMeACoffee() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-72 rounded-2xl border border-amber-400/30 bg-slate-900/95 p-4 backdrop-blur-md shadow-2xl animate-rise">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍺</span>
              <div>
                <p className="text-sm font-bold text-white">Support Staffroom Intel</p>
                <p className="text-[11px] text-amber-300">Created by Gary Stanyard</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
              aria-label="Close support modal"
            >
              ✕
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-300">
            If Staffroom Intel helped you negotiate a better contract or find honest school data, consider buying me a beer!
          </p>

          <div className="mt-3 flex justify-center rounded-xl bg-white p-2">
            <Image
              src="/bmc-qr.png"
              alt="Scan QR Code to Support on Buy Me a Coffee"
              width={160}
              height={160}
              className="h-auto w-40 rounded-lg"
            />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <a
              href="https://www.buymeacoffee.com/garystanyard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#FFDD00] py-2 text-xs font-bold text-slate-950 transition hover:bg-[#ffe533]"
            >
              <span>🍺</span> Buy me a beer on BMC
            </a>
            <a
              href="https://www.linkedin.com/in/garystanyard/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span>💼</span> Connect on LinkedIn
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="group flex items-center gap-2 rounded-full border border-amber-400/40 bg-[#FFDD00] px-4 py-2 text-xs font-bold text-slate-950 shadow-lg transition hover:scale-105 hover:bg-[#ffe533]"
      >
        <span className="text-base">🍺</span>
        <span>Buy me a beer</span>
      </button>
    </div>
  );
}
