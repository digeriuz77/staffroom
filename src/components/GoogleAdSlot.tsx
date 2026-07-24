"use client";

import { useEffect } from "react";

export interface GoogleAdSlotProps {
  client?: string;
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
}

export function GoogleAdSlot({
  client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID,
  slot,
  format = "auto",
  responsive = true,
  className = "",
}: GoogleAdSlotProps) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch {
      // Ignore adblocker errors
    }
  }, []);

  if (!client) {
    // Placeholder container when AdSense ID is not yet set in environment
    return (
      <div className={`my-4 flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-slate-500 ${className}`}>
        <span>📢 Sponsor Advertisement Slot (Set <code className="text-indigo-300">NEXT_PUBLIC_GOOGLE_ADSENSE_ID</code> to activate)</span>
      </div>
    );
  }

  return (
    <div className={`my-4 overflow-hidden rounded-xl bg-white/[0.02] ${className}`}>
      <ins
        className="adsbygoogle block"
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
