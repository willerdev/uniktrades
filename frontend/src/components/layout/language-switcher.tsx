"use client";

import { useLocaleStore } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-[var(--color-border)] bg-foreground/5 p-0.5 text-xs font-semibold",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={cn(
          "rounded-md px-2.5 py-1.5 transition-colors",
          locale === "fr"
            ? "bg-primary text-white"
            : "text-muted hover:text-foreground",
        )}
      >
        {compact ? "FR" : "FR"}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-md px-2.5 py-1.5 transition-colors",
          locale === "en"
            ? "bg-primary text-white"
            : "text-muted hover:text-foreground",
        )}
      >
        EN
      </button>
    </div>
  );
}
