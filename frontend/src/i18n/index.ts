"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useCallback } from "react";
import { DEFAULT_LOCALE, type Locale, type Messages } from "@/i18n/types";
import { fr } from "@/i18n/messages/fr";
import { en } from "@/i18n/messages/en";

const catalogs: Record<Locale, Messages> = {
  fr: fr as unknown as Messages,
  en: en as unknown as Messages,
};

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    { name: "uniktrades-locale" },
  ),
);

type DotPaths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: DotPaths<
        T[K],
        Prefix extends "" ? K : `${Prefix}.${K}`
      >;
    }[keyof T & string];

export type MessageKey = DotPaths<Messages>;

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const raw =
    getByPath(catalogs[locale], key) ??
    getByPath(catalogs.fr, key) ??
    key;
  if (!vars) return raw;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    raw,
  );
}

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );
}
