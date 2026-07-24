"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("staffroom_theme") as "dark" | "light" | null;
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
      Promise.resolve().then(() => setTheme(saved));
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("staffroom_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
      aria-label="Toggle theme"
    >
      <span>{theme === "dark" ? "☀️" : "🌙"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
