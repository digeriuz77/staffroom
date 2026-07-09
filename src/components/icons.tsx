import type { SentimentSource } from "@/lib/types";

type IconProps = { className?: string };

export function RedditIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M22 12.07c0-1.23-.99-2.23-2.22-2.23-.6 0-1.14.24-1.54.62-1.52-1-3.6-1.65-5.9-1.73l1.0-4.74 3.3.73c.04.82.7 1.48 1.54 1.48.85 0 1.54-.69 1.54-1.54 0-.85-.69-1.54-1.54-1.54-.6 0-1.12.35-1.37.86l-3.68-.82a.46.46 0 0 0-.36.06.45.45 0 0 0-.18.32l-1.12 5.25c-2.32.07-4.42.72-5.95 1.73-.4-.38-.94-.62-1.54-.62-1.23 0-2.22 1-2.22 2.23 0 .9.53 1.67 1.28 2.02-.04.22-.06.45-.06.68 0 3.05 3.78 5.52 8.45 5.52s8.45-2.47 8.45-5.52c0-.23-.02-.46-.06-.68.75-.35 1.28-1.12 1.28-2.02ZM7.5 13.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm8.06 3.97c-1.05.8-2.95.86-3.56.86-.62 0-2.51-.06-3.57-.86a.42.42 0 1 1 .53-.65c.67.51 2.1.69 3.04.69s2.37-.18 3.04-.69a.42.42 0 1 1 .52.65Zm-.06-2.47a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
    </svg>
  );
}

export function GlassdoorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M15.5 3H7.06A4.06 4.06 0 0 0 3 7.06v.31h3.5V7a.5.5 0 0 1 .5-.5h8.5A1.5 1.5 0 0 0 17 5V4.5A1.5 1.5 0 0 0 15.5 3ZM6.5 18.5A1.5 1.5 0 0 0 8 20h8a1.5 1.5 0 0 0 1.5-1.5V9h-11v9.5Z" />
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SourceIcon({ source, className }: { source: SentimentSource; className?: string }) {
  switch (source) {
    case "reddit":
      return <RedditIcon className={className} />;
    case "glassdoor":
      return <GlassdoorIcon className={className} />;
    case "facebook":
      return <FacebookIcon className={className} />;
    case "instagram":
      return <InstagramIcon className={className} />;
    default:
      return null;
  }
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M9 15l6-6" />
      <path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1" />
      <path d="M13 18l-1 1a4 4 0 0 1-6-6l1-1" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2Z" opacity="0.9" />
      <path d="M19 14l.9 2.7 2.8.8-2.8.9-.9 2.6-.9-2.6-2.8-.9 2.8-.8.9-2.7Z" opacity="0.6" />
    </svg>
  );
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
