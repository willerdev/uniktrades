"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { api, type PublicPayoutFeed } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/i18n";
import { useLocaleStore } from "@/i18n";

export function RecentPayoutsShowcase() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const [feed, setFeed] = useState<PublicPayoutFeed | null>(null);

  useEffect(() => {
    api.public
      .recentPayouts(12)
      .then(setFeed)
      .catch(() => setFeed(null));
  }, []);

  function sourceLabel(source: string) {
    if (source === "DEPOSITOR") return t("payouts.wallet");
    if (source === "TP_REWARD") return t("payouts.reward");
    if (source === "PROFIT_SHARE") return t("payouts.profitShare");
    return t("payouts.payout");
  }

  function timeAgo(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return t("payouts.justNow");
    if (hours < 24) return t("payouts.hoursAgo", { n: hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return t("payouts.yesterday");
    if (days < 7) return t("payouts.daysAgo", { n: days });
    return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US");
  }

  const items = feed?.items ?? [];
  const doubled = items.length > 0 ? [...items, ...items] : [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {t("payouts.title")}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("payouts.subtitle")}
        </h2>
        <p className="mt-3 text-muted">
          {t("payouts.liveHint")}
          {feed && feed.totalPaid > 0 && (
            <>
              {" "}
              —{" "}
              <strong className="text-foreground">
                {formatCurrency(feed.totalPaid)}
              </strong>{" "}
              {t("payouts.paidOut")}
            </>
          )}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-foreground/[0.03] p-8 text-center text-sm text-muted">
          {t("payouts.empty")}
        </div>
      ) : (
        <div className="relative mt-10 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--background)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--background)] to-transparent" />
          <motion.div
            className="flex w-max gap-4"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: Math.max(items.length * 4, 24),
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {doubled.map((item, i) => (
              <div
                key={`${item.displayName}-${item.paidAt}-${i}`}
                className="w-72 shrink-0 rounded-2xl border border-[var(--color-border)] bg-foreground/[0.03] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.displayName}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {sourceLabel(item.source)}
                    </p>
                  </div>
                  <div className="rounded-full bg-primary/15 p-2 text-primary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-4 text-2xl font-bold tabular-nums text-foreground">
                  {formatCurrency(item.amount)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {timeAgo(item.paidAt)}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {items.slice(0, 3).map((item, i) => (
            <motion.div
              key={`${item.displayName}-grid-${i}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-[var(--color-border)] bg-foreground/[0.03] px-4 py-3 text-sm"
            >
              <span className="text-foreground">{item.displayName}</span>
              <span className="text-muted"> {t("payouts.received")} </span>
              <span className="font-semibold tabular-nums text-primary">
                {formatCurrency(item.amount)}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
