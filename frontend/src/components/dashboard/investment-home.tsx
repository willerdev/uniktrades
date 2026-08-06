"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  Landmark,
  ScrollText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHAIN_CONTRACT_MIN_USD,
  CHAIN_HIGH_YIELD_PERCENT,
  CHAIN_MID_YIELD_PERCENT,
  SMART_INVEST_DAILY_YIELD_PERCENT,
  SMART_INVEST_MIN_USD,
} from "@/components/investor/investment-product-chooser";

const PRODUCTS = [
  {
    id: "smart",
    href: "/invest",
    icon: TrendingUp,
    title: "Smart Investment",
    tagline: `${SMART_INVEST_DAILY_YIELD_PERCENT}% daily · min $${SMART_INVEST_MIN_USD.toLocaleString()}`,
    how: [
      `Minimum deposit $${SMART_INVEST_MIN_USD.toLocaleString()} USDT — $0 enrollment fee.`,
      `${SMART_INVEST_DAILY_YIELD_PERCENT}% daily yield (VIP up to 10%) credited to your wallet.`,
      "New allocations earn after a 24-hour hold.",
      "Optional auto-reinvest compounds most of each day’s return.",
    ],
    start: [
      "Open Invest and choose Smart Investment.",
      "Deposit with wallet balance or crypto.",
      "Complete KYC only when you are ready to withdraw.",
    ],
    cta: "Deposit to Smart Investment",
  },
  {
    id: "chain",
    href: "/blockchain",
    icon: Blocks,
    title: "On-chain contract",
    tagline: `${CHAIN_MID_YIELD_PERCENT}–${CHAIN_HIGH_YIELD_PERCENT}% daily · min $${CHAIN_CONTRACT_MIN_USD.toLocaleString()}`,
    how: [
      `Minimum deposit $${CHAIN_CONTRACT_MIN_USD.toLocaleString()} USDT.`,
      `Indicative ${CHAIN_MID_YIELD_PERCENT}%–${CHAIN_HIGH_YIELD_PERCENT}% daily by tier — no withdrawal fee.`,
      "Verify ID & liveness, get approved, then deposit to activate.",
      "Manage the vault from the Blockchain dashboard.",
    ],
    start: [
      "Open Blockchain and agree to contract terms.",
      "Complete verification and wait for approval.",
      "Launch your first on-chain deposit.",
    ],
    cta: "Deposit on-chain",
  },
  {
    id: "unitrust",
    href: "/unitrust",
    icon: ScrollText,
    title: "Unitrust",
    tagline: "5% daily on corpus · monthly withdrawals",
    how: [
      "Allocate capital into Unitrust for a fixed 5% daily yield on your corpus.",
      "Earnings accrue daily while your principal stays invested.",
      "Redeem to your wallet once per month on the scheduled window.",
    ],
    start: [
      "Have USDT available in your platform wallet.",
      "Open Unitrust and enroll / allocate the amount you want working.",
      "Return at the monthly window to withdraw earnings to wallet.",
    ],
    cta: "Open Unitrust",
  },
  {
    id: "loans",
    href: "/loans",
    icon: Landmark,
    title: "Loans",
    tagline: "Advance on projected earnings",
    how: [
      "Choose daily, weekly, or monthly based on your projected invest earnings.",
      "You receive 80% of that period’s projected earnings as an advance.",
      "Repay principal + 20% interest from your wallet after approval.",
    ],
    start: [
      "Build meaningful Smart Investment or Unitrust earnings.",
      "Complete KYC (same requirement as withdrawals).",
      "Request a term on Loans — admin approves, then funds hit your wallet.",
    ],
    cta: "Open Loans",
  },
] as const;

export function InvestmentHome({ displayName }: { displayName?: string }) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {displayName ? `Welcome, ${displayName}` : "Your investment hub"}
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          Choose Smart Investment or an on-chain vault contract — each shows its
          minimum and daily yield before you deposit.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="flex flex-wrap gap-2"
      >
        <Link href="/wallet">
          <Button size="sm" variant="secondary" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Wallet
          </Button>
        </Link>
        <Link href="/invest">
          <Button size="sm" variant="secondary" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Invest
          </Button>
        </Link>
        <Link href="/blockchain">
          <Button size="sm" variant="secondary" className="gap-1.5">
            <Blocks className="h-3.5 w-3.5" />
            Blockchain
          </Button>
        </Link>
        <Link href="/unitrust">
          <Button size="sm" variant="secondary" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            Unitrust
          </Button>
        </Link>
        <Link href="/loans">
          <Button size="sm" variant="secondary" className="gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            Loans
          </Button>
        </Link>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {PRODUCTS.map((product, i) => {
          const Icon = product.icon;
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
            >
              <Card className="flex h-full flex-col border-[var(--color-border)] bg-[var(--color-surface)]">
                <CardHeader className="pb-3">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg text-foreground">{product.title}</CardTitle>
                  <p className="text-sm text-muted">{product.tagline}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700/80">
                      How it works
                    </p>
                    <ul className="space-y-1.5">
                      {product.how.map((line) => (
                        <li
                          key={line}
                          className="text-sm leading-relaxed text-foreground/80"
                        >
                          <span className="mr-1.5 text-primary/80">·</span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                      Get started
                    </p>
                    <ol className="space-y-1.5">
                      {product.start.map((line, idx) => (
                        <li
                          key={line}
                          className="flex gap-2 text-sm leading-relaxed text-foreground/80"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-foreground">
                            {idx + 1}
                          </span>
                          {line}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="mt-auto pt-2">
                    <Link href={product.href}>
                      <Button className="w-full gap-1.5">
                        {product.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
