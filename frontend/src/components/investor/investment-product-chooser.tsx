"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Blocks, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SMART_INVEST_MIN_USD = 100;
export const SMART_INVEST_DAILY_YIELD_PERCENT = 5;
export const CHAIN_CONTRACT_MIN_USD = 2000;
export const CHAIN_MID_YIELD_PERCENT = 10;
export const CHAIN_HIGH_YIELD_PERCENT = 15;

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

type Props = {
  onChooseSmart: () => void;
  className?: string;
};

/**
 * Choose between Smart Investment (platform) and on-chain vault contract.
 * Smart → wallet transfer UI; On-chain → /blockchain enrollment + MetaMask deposit.
 */
export function InvestmentProductChooser({ onChooseSmart, className }: Props) {
  return (
    <div className={cn("space-y-4", className)}>
      <motion.div {...fade} className="space-y-1">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">
          Choose how to invest
        </h2>
        <p className="text-sm text-muted">
          Fund your platform wallet first for Smart Investment. On-chain vault
          uses MetaMask after KYC. No platform enrollment fee on either path.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          {...fade}
          transition={{ delay: 0.05 }}
          className="flex flex-col rounded-2xl border border-indigo-500/35 bg-gradient-to-br from-indigo-950/70 via-[#0f1419] to-cyan-950/30 p-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            Smart Investment
          </h3>
          <p className="mt-1 text-sm text-muted">
            Transfer from your platform wallet. Daily yield credits back to
            wallet.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-[var(--color-border)] pb-2">
              <dt className="text-muted">Minimum</dt>
              <dd className="font-semibold text-foreground">
                ${SMART_INVEST_MIN_USD.toLocaleString()} USDT
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[var(--color-border)] pb-2">
              <dt className="text-muted">Daily yield</dt>
              <dd className="font-semibold text-emerald-700">
                {SMART_INVEST_DAILY_YIELD_PERCENT}% (VIP up to 10%)
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Enrollment fee</dt>
              <dd className="font-semibold text-foreground">$0</dd>
            </div>
          </dl>
          <Button
            type="button"
            className="mt-5 w-full gap-1.5"
            size="lg"
            onClick={onChooseSmart}
          >
            Fund from wallet
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        <motion.div
          {...fade}
          transition={{ delay: 0.1 }}
          className="flex flex-col rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-[#0f1419] to-orange-950/20 p-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800">
            <Blocks className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            On-chain contract
          </h3>
          <p className="mt-1 text-sm text-muted">
            Vault on-chain — verify once, launch your tier, then deposit USDT
            via MetaMask (not the platform wallet invoice).
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-[var(--color-border)] pb-2">
              <dt className="text-muted">Minimum</dt>
              <dd className="font-semibold text-foreground">
                ${CHAIN_CONTRACT_MIN_USD.toLocaleString()} USDT
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-[var(--color-border)] pb-2">
              <dt className="text-muted">Daily yield</dt>
              <dd className="font-semibold text-emerald-700">
                {CHAIN_MID_YIELD_PERCENT}%–{CHAIN_HIGH_YIELD_PERCENT}% by tier
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Withdrawal fee</dt>
              <dd className="font-semibold text-foreground">$0</dd>
            </div>
          </dl>
          <Link href="/blockchain" className="mt-5 block">
            <Button type="button" className="w-full gap-1.5" size="lg" variant="secondary">
              Enroll on-chain
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
