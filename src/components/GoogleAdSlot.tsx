"use client";

export interface GoogleAdSlotProps {
  client?: string;
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
}

/**
 * AdSense is currently DISABLED — this renders a placeholder only.
 *
 * To go live:
 *   1. Set NEXT_PUBLIC_GOOGLE_ADSENSE_ID in the environment.
 *   2. Uncomment the implementation below.
 *   3. Load the adsbygoogle.js script in the document <head>.
 *   4. Keep the consent gate: only render the <ins> element after the user has
 *      accepted via ConsentBanner (getConsent() === "accepted"). Loading ads
 *      without consent violates ePrivacy/GDPR for EEA/UK visitors and AdSense
 *      program policies.
 *
 * import { useEffect, useState } from "react";
 * import { getConsent } from "@/components/ConsentBanner";
 *
 * export function GoogleAdSlot({
 *   client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID,
 *   slot,
 *   format = "auto",
 *   responsive = true,
 *   className = "",
 * }: GoogleAdSlotProps) {
 *   const [consented, setConsented] = useState(false);
 *
 *   useEffect(() => {
 *     const sync = () => setConsented(getConsent() === "accepted");
 *     sync();
 *     window.addEventListener("si-consent-changed", sync);
 *     return () => window.removeEventListener("si-consent-changed", sync);
 *   }, []);
 *
 *   useEffect(() => {
 *     if (!consented) return;
 *     try {
 *       if (typeof window !== "undefined") {
 *         ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
 *       }
 *     } catch {
 *       // Ignore adblocker errors
 *     }
 *   }, [consented]);
 *
 *   if (!client || !consented) return null;
 *
 *   return (
 *     <div className={`my-4 overflow-hidden rounded-xl bg-white/[0.02] ${className}`}>
 *       <ins
 *         className="adsbygoogle block"
 *         data-ad-client={client}
 *         data-ad-slot={slot}
 *         data-ad-format={format}
 *         data-full-width-responsive={responsive ? "true" : "false"}
 *       />
 *     </div>
 *   );
 * }
 */
export function GoogleAdSlot({ className = "" }: GoogleAdSlotProps) {
  return (
    <div className={`my-4 flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-slate-500 ${className}`}>
      <span>📢 Sponsor Advertisement Slot (advertising not currently active)</span>
    </div>
  );
}
