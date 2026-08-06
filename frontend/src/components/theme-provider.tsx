"use client";

import { useEffect } from "react";

/** Light-only: strip any persisted `dark` class and lock document to light. */
export function ThemeProvider() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    try {
      localStorage.setItem(
        "uniktrades-theme",
        JSON.stringify({ state: { theme: "light" }, version: 0 }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
