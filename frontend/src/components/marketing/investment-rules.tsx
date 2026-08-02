"use client";

import { motion } from "framer-motion";
import { Clock, Crown, Lock, Percent, RefreshCw, ShieldCheck } from "lucide-react";
import { DailyCreditTimeText } from "@/components/daily-credit-time-text";
import { useT, type MessageKey } from "@/i18n";

const FEE_TIERS = [
  { range: "$100 – $200", fee: "$10" },
  { range: "$201 – $500", fee: "$50" },
  { range: "$501 – under $1,000", fee: "$100" },
  { range: "$1,000 – $5,000", fee: "$200" },
] as const;

const RULE_DEFS: {
  icon: typeof Percent;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}[] = [
  { icon: Percent, titleKey: "rules.feeTitle", bodyKey: "rules.feeBody" },
  { icon: Clock, titleKey: "rules.holdTitle", bodyKey: "rules.holdBody" },
  { icon: Crown, titleKey: "rules.vipTitle", bodyKey: "rules.vipBody" },
  { icon: Lock, titleKey: "rules.minTitle", bodyKey: "rules.minBody" },
  {
    icon: RefreshCw,
    titleKey: "rules.reinvestTitle",
    bodyKey: "rules.reinvestBody",
  },
  { icon: ShieldCheck, titleKey: "rules.kycTitle", bodyKey: "rules.kycBody" },
];

export function InvestmentRules() {
  const t = useT();

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {t("rules.eyebrow")}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("rules.title")}
        </h2>
        <p className="mt-4 text-lg text-muted">{t("rules.subtitle")}</p>
      </motion.div>

      <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {RULE_DEFS.map((rule, i) => {
          const Icon = rule.icon;
          const title = t(rule.titleKey);
          const body = t(rule.bodyKey);
          return (
            <motion.div
              key={rule.titleKey}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: 0.05 * i,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group border-t border-[var(--color-border)] pt-6"
            >
              <div className="mb-4 inline-flex text-primary transition-transform duration-300 group-hover:translate-x-0.5">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {body === "yield-hold" ? (
                  <>
                    {t("rules.holdIntro")}{" "}
                    <DailyCreditTimeText variant="around" />.
                  </>
                ) : (
                  body
                )}
              </p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-16"
      >
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          {t("rules.feeBySize")}
        </h3>
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-foreground/10 sm:grid-cols-4">
          {FEE_TIERS.map((tier, i) => (
            <motion.div
              key={tier.range}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 * i }}
              className="bg-background px-5 py-5"
            >
              <p className="text-xs text-muted">{tier.range}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {tier.fee}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
