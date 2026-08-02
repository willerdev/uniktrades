"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/i18n";

/** Keeps <html lang> in sync with the selected locale (FR default). */
export function LocaleProvider({ children }: { children?: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return children ?? null;
}
