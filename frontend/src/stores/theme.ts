import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeState = {
  /** App is light-only; kept for chart helpers that still read the store. */
  theme: "light";
  setTheme: (theme: "light") => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: () => set({ theme: "light" }),
      toggleTheme: () => set({ theme: "light" }),
    }),
    { name: "uniktrades-theme" },
  ),
);
