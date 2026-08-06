"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2,
  RefreshCw,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, type InvestorStatus } from "@/lib/api";
import { InvestmentReturnsPanel } from "@/components/investor/investment-returns";
import { InvestorPolicyBanners } from "@/components/investor/investor-policy-banners";
import { CurrencySwitcher } from "@/components/currency-switcher";
import {
  cn,
  formatCurrency,
  formatMoney,
  isLocalCurrencyDisplay,
} from "@/lib/utils";
import { DailyCreditTimeText } from "@/components/daily-credit-time-text";

/** Enrollment fee by deposit size — deducted from transfer amount. */
function resolveFeeClient(amount: number): number | null {
  if (!Number.isFinite(amount) || amount < 100 || amount > 5000) return null;
  if (amount <= 200) return 10;
  if (amount <= 500) return 50;
  if (amount < 1000) return 50;
  return 200;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function PortfolioSummary({
  balance,
  enrolledAt,
  dailyYieldPercent,
  totalProfit,
  tradingProfit,
  walletEarnings,
  display,
  vipActive,
  paused,
  yieldPaused,
  autoReinvest,
  autoReinvestFeePercent,
  loading,
  onRefresh,
}: {
  balance: number;
  enrolledAt?: string | null;
  dailyYieldPercent: number;
  totalProfit: number;
  tradingProfit: number;
  walletEarnings: number;
  display: InvestorStatus["displayCurrency"];
  vipActive?: boolean;
  paused?: boolean;
  yieldPaused?: boolean;
  autoReinvest?: boolean;
  autoReinvestFeePercent?: number;
  loading?: boolean;
  onRefresh: () => void;
}) {
  const localCurrency = isLocalCurrencyDisplay(display);
  const profitPositive = totalProfit >= 0;

  return (
    <motion.div
      {...fadeUp}
      className="xl:col-span-12 xl:row-start-1 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div className="relative px-5 pb-5 pt-5 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/15 to-transparent"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Portfolio
            </p>
            <p
              className={cn(
                "mt-2 font-bold tracking-tight text-foreground",
                localCurrency ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl",
              )}
            >
              {formatMoney(balance, display)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>
                {enrolledAt
                  ? `Enrolled ${new Date(enrolledAt).toLocaleDateString()}`
                  : "Active investor"}
              </span>
              {vipActive && (
                <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                  VIP
                </span>
              )}
              {paused && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-800">
                  Paused
                </span>
              )}
              {yieldPaused && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-800">
                  Yield paused
                </span>
              )}
              {autoReinvest && (
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-700">
                  Auto-reinvest
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted hover:bg-foreground/5 hover:text-foreground"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh investment status"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid border-t border-[var(--color-border)] sm:grid-cols-3">
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Daily yield
          </p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">
            {dailyYieldPercent}%
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {autoReinvest ? (
              <>
                {(autoReinvestFeePercent ?? 0) > 0
                  ? `Auto-reinvest on (${autoReinvestFeePercent}% fee)`
                  : "Auto-reinvest on (100% compounds)"}
              </>
            ) : (
              <>
                Credited to wallet{" "}
                <DailyCreditTimeText
                  country={display?.derivedFromCountry}
                  variant="short"
                />
              </>
            )}
          </p>
        </div>
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Credited daily
          </p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">Wallet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Yield lands in your platform wallet
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Total profit
          </p>
          <p
            className={cn(
              "mt-1.5 font-bold tracking-tight",
              profitPositive ? "text-emerald-700" : "text-red-600",
              localCurrency ? "text-xl sm:text-2xl" : "text-2xl",
            )}
          >
            {profitPositive ? "+" : ""}
            {formatMoney(totalProfit, display)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Trading {formatMoney(tradingProfit, display)} · Wallet{" "}
            {formatMoney(walletEarnings, display)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function tradeStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "closed" || s === "open") return "bg-emerald-500/15 text-emerald-400";
  if (s === "failed" || s === "skipped") return "bg-red-500/15 text-red-400";
  return "bg-foreground/5 text-muted";
}

export function InvestHub() {
  const [status, setStatus] = useState<InvestorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [error, setError] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [reinvestLoading, setReinvestLoading] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [vipLoading, setVipLoading] = useState(false);

  const investmentMin = status?.investmentMin ?? 100;
  const investmentMax = status?.investmentMax ?? 5000;
  const parsedInvestment = Number(investmentAmount);
  const hasValidParsed =
    investmentAmount.trim() !== "" && Number.isFinite(parsedInvestment);
  const feeUsdt =
    (hasValidParsed ? resolveFeeClient(parsedInvestment) : null) ?? 0;
  const netInvested =
    hasValidParsed && parsedInvestment > feeUsdt
      ? Math.round((parsedInvestment - feeUsdt) * 100) / 100
      : 0;
  const depositDue = hasValidParsed ? parsedInvestment : 0;
  const insufficientWallet =
    hasValidParsed && walletBalance < depositDue;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, w] = await Promise.all([
        api.investor.status(),
        api.wallet.summary(),
      ]);
      setStatus(s);
      setWalletBalance(w.availableBalance);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load investment status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enroll() {
    setPayLoading(true);
    setError("");
    try {
      const amount = Number(investmentAmount);
      if (!Number.isFinite(amount) || amount < investmentMin || amount > investmentMax) {
        throw new Error(
          `Enter an investment between ${formatCurrency(investmentMin)} and ${formatCurrency(investmentMax)}`,
        );
      }
      if (resolveFeeClient(amount) == null) {
        throw new Error("Investment amount is outside a fee tier");
      }
      if (walletBalance < amount) {
        throw new Error(
          `Insufficient wallet balance — need ${formatCurrency(amount)} but have ${formatCurrency(walletBalance)}. Deposit on the Wallet page first.`,
        );
      }
      const res = await api.investor.enrollCheckout("TRC20", "wallet", amount);
      if (res.active || res.success) {
        await refresh();
        setInvestmentAmount("");
        return;
      }
      throw new Error(res.message || "Could not enroll from wallet");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enrollment failed");
    } finally {
      setPayLoading(false);
    }
  }

  async function upgradeVip() {
    setVipLoading(true);
    setError("");
    try {
      await api.investor.vipUpgrade();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "VIP upgrade failed");
    } finally {
      setVipLoading(false);
    }
  }

  if (loading && !status) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!status?.active) {
    return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <CurrencySwitcher
            displayCurrency={status?.displayCurrency}
            onChanged={refresh}
          />
        </div>
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950 via-[#0f1419] to-cyan-950 p-6 text-white"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              Smart Investment
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Start Smart Investment
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/75">
              Fund your platform wallet first, then transfer ${investmentMin}+
              USDT here. Enrollment fee is deducted from the amount you transfer
              (example: $560 → $50 fee → $510 invested). Earn{" "}
              {status?.dailyYieldPercent ?? 5}% daily on invested capital —
              credited to your wallet{" "}
              <DailyCreditTimeText
                country={status?.displayCurrency?.derivedFromCountry}
                variant="short"
              />
              . New capital starts earning after 24 hours.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: TrendingUp, text: `${status?.dailyYieldPercent ?? 5}% daily yield` },
                { icon: Shield, text: "Fee from transfer amount" },
                { icon: Wallet, text: "Fund via Wallet page" },
              ].map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white/90"
                >
                  <Icon className="h-4 w-4 shrink-0 text-cyan-300" />
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white/80">
              <p>
                Minimum{" "}
                <strong className="text-white">
                  {formatCurrency(investmentMin)}
                </strong>
                {" · "}
                maximum{" "}
                <strong className="text-white">
                  {formatCurrency(investmentMax)}
                </strong>
                {" · "}
                <strong className="text-emerald-300">
                  {status?.dailyYieldPercent ?? 5}% daily
                </strong>
                {status?.vipDailyYieldPercent
                  ? ` (VIP ${status.vipDailyYieldPercent}%)`
                  : " (VIP up to 10%)"}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border-2 border-primary/40 bg-[var(--color-surface)] p-5 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Transfer wallet → Smart Invest
              </h3>
              <p className="mt-1 text-xs text-muted">
                Enter how much to move from your wallet. Fee comes out of that
                amount; the rest becomes your investment balance.
              </p>
            </div>
            <Link
              href="/blockchain"
              className="text-xs font-medium text-primary hover:underline"
            >
              Prefer on-chain contract?
            </Link>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-background px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Available wallet balance
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(walletBalance)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Crypto and MoMo deposits are created only on the{" "}
                <Link href="/wallet" className="text-primary hover:underline">
                  Wallet
                </Link>{" "}
                page.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Transfer amount (USDT)
              </label>
              <Input
                type="number"
                min={investmentMin}
                max={investmentMax}
                step="1"
                placeholder={`Enter amount (min ${formatCurrency(investmentMin)})`}
                value={investmentAmount}
                onChange={(e) => {
                  setInvestmentAmount(e.target.value);
                  setError("");
                }}
              />
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-background px-4 py-3 text-sm text-foreground">
              <div className="flex justify-between gap-3">
                <span className="text-muted">Wallet debit</span>
                <span className="font-semibold text-foreground">
                  {hasValidParsed ? formatCurrency(depositDue) : "—"}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <span className="text-muted">Enrollment fee</span>
                <span className="font-semibold text-foreground">
                  {hasValidParsed ? formatCurrency(feeUsdt) : "—"}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-3 border-t border-[var(--color-border)] pt-2">
                <span className="text-muted">Invested after fee</span>
                <span className="font-semibold text-emerald-700">
                  {hasValidParsed && netInvested > 0
                    ? formatCurrency(netInvested)
                    : "—"}
                </span>
              </div>
              {hasValidParsed && (
                <p className="mt-2 text-xs text-muted">
                  Earn {status?.dailyYieldPercent ?? 5}% daily on invested
                  capital · tiers $10 / $50 / $50 / $200 by size
                </p>
              )}
            </div>

            {insufficientWallet && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
                Insufficient wallet balance — need{" "}
                <strong>{formatCurrency(depositDue)}</strong> but have{" "}
                <strong>{formatCurrency(walletBalance)}</strong>.{" "}
                <Link href="/wallet" className="font-medium text-primary hover:underline">
                  Deposit on Wallet
                </Link>{" "}
                first, then return here to transfer.
              </p>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              type="button"
              className="w-full sm:w-auto"
              size="lg"
              onClick={() => void enroll()}
              disabled={
                payLoading ||
                !hasValidParsed ||
                insufficientWallet ||
                parsedInvestment < investmentMin ||
                parsedInvestment > investmentMax ||
                netInvested <= 0
              }
            >
              {payLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {hasValidParsed
                ? `Confirm transfer ${formatCurrency(depositDue)} → invest ${formatCurrency(netInvested)}`
                : "Confirm transfer from wallet"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const display = status.displayCurrency;
  const vip = status.vip;
  const localCurrency = isLocalCurrencyDisplay(display);
  const parsedTransfer = Number(transferAmount);
  const hasValidTransfer =
    transferAmount.trim() !== "" &&
    Number.isFinite(parsedTransfer) &&
    parsedTransfer > 0;
  const insufficientAllocate =
    hasValidTransfer && walletBalance < parsedTransfer;

  return (
    <div className="space-y-5">
      <InvestorPolicyBanners
        investmentBalance={
          status.investmentBalance ?? status.investmentDeposited ?? 0
        }
        vipActive={Boolean(vip?.active)}
        vipDailyYieldPercent={
          vip?.benefits?.dailyYieldPercent ??
          status.vipDailyYieldPercent ??
          10
        }
        minBalancePolicy={status.minBalancePolicy ?? null}
      />
      <div className="flex justify-end">
        <CurrencySwitcher displayCurrency={display} onChanged={refresh} />
      </div>
      <div className="space-y-5 xl:grid xl:grid-cols-12 xl:items-start xl:gap-5 xl:space-y-0">
      <PortfolioSummary
        balance={status.investmentBalance ?? status.investmentDeposited ?? 0}
        enrolledAt={status.enrolledAt}
        dailyYieldPercent={status.dailyYieldPercent}
        totalProfit={status.totalProfit}
        tradingProfit={status.tradingProfit}
        walletEarnings={status.walletEarnings}
        display={display}
        vipActive={Boolean(vip?.active)}
        paused={Boolean(status.settings?.paused)}
        yieldPaused={Boolean(status.settings?.yieldPaused)}
        autoReinvest={Boolean(status.settings?.autoReinvestEarnings)}
        autoReinvestFeePercent={status.autoReinvestFeePercent}
        loading={loading}
        onRefresh={() => void refresh()}
      />

      <motion.div
        {...fadeUp}
        transition={{ delay: 0.16 }}
        className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-4 xl:col-span-5 xl:row-start-2"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-400/20 text-amber-900">VIP</Badge>
              <h3 className="text-sm font-semibold text-foreground">
                {vip?.active ? "VIP active" : "Upgrade to VIP"}
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted">
              {vip?.active
                ? `Expires ${vip.expiresAt ? new Date(vip.expiresAt).toLocaleDateString() : "—"} · ${vip.benefits?.dailyYieldPercent ?? status.vipDailyYieldPercent ?? 10}% daily + weekends + $0 withdraw fee`
                : `$${vip?.feeUsdt ?? 50}/month from wallet · ${vip?.benefits?.dailyYieldPercent ?? status.vipDailyYieldPercent ?? 10}% daily + weekends + $0 withdraw fee`}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>
                •{" "}
                {vip?.benefits?.dailyYieldPercent ??
                  status.vipDailyYieldPercent ??
                  10}
                % daily investment yield (VIP default)
              </li>
              <li>• Earn daily yield on Saturdays &amp; Sundays</li>
              <li>• Zero commission on wallet withdrawals</li>
            </ul>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={vipLoading || walletBalance < (vip?.feeUsdt ?? 50)}
            onClick={() => void upgradeVip()}
          >
            {vipLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {vip?.active ? "Renew VIP" : `Upgrade — $${vip?.feeUsdt ?? 50}`}
          </Button>
        </div>
        {!vip?.active && walletBalance < (vip?.feeUsdt ?? 50) && (
          <p className="mt-2 text-xs text-muted">
            Need {formatCurrency(vip?.feeUsdt ?? 50)} in wallet to upgrade.{" "}
            <Link href="/wallet" className="text-primary hover:underline">
              Deposit on Wallet
            </Link>
          </p>
        )}
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ delay: 0.18 }}
        className="rounded-2xl border-2 border-primary/35 bg-[var(--color-surface)] p-4 xl:col-span-5 xl:row-start-3"
      >
        <h3 className="text-base font-semibold text-foreground">
          Transfer wallet ↔ Smart Invest
        </h3>
        <p className="mt-1 text-xs text-muted">
          Move funds between your platform wallet and investment balance.
          Deposit crypto only on{" "}
          <Link href="/wallet" className="text-primary hover:underline">
            Wallet
          </Link>
          . On-chain vault funding is on{" "}
          <Link href="/blockchain" className="text-primary hover:underline">
            Contract
          </Link>
          . Daily yield only applies to capital invested for at least 24 hours.
        </p>

        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-background px-3 py-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted">Available wallet</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoney(status.walletBalance, display)}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3">
            <span className="text-muted">Investment balance</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoney(status.investmentBalance ?? 0, display)}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3 border-t border-[var(--color-border)] pt-1.5">
            <span className="text-muted">Top-up transfer fee</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(0)}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-foreground">
            Amount (USDT)
          </label>
          <Input
            type="number"
            min={0.01}
            step="0.01"
            value={transferAmount}
            onChange={(e) => {
              setTransferAmount(e.target.value);
              setError("");
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            disabled={transferLoading || insufficientAllocate || !hasValidTransfer}
            onClick={() => {
              const amount = Number(transferAmount);
              if (!Number.isFinite(amount) || amount <= 0) {
                setError("Enter a valid transfer amount");
                return;
              }
              if (walletBalance < amount) {
                setError(
                  `Insufficient wallet balance — need ${formatCurrency(amount)} but have ${formatCurrency(walletBalance)}. Deposit on Wallet first.`,
                );
                return;
              }
              setTransferLoading(true);
              setError("");
              void api.investor
                .allocate(amount)
                .then(() => {
                  setTransferAmount("");
                  return refresh();
                })
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Transfer failed"),
                )
                .finally(() => setTransferLoading(false));
            }}
          >
            {transferLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Confirm wallet → investment
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 sm:flex-none"
            disabled={transferLoading || !hasValidTransfer}
            onClick={() => {
              const amount = Number(transferAmount);
              if (!Number.isFinite(amount) || amount <= 0) {
                setError("Enter a valid transfer amount");
                return;
              }
              setTransferLoading(true);
              setError("");
              void api.investor
                .redeem(amount)
                .then(() => {
                  setTransferAmount("");
                  return refresh();
                })
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Transfer failed"),
                )
                .finally(() => setTransferLoading(false));
            }}
          >
            Investment → wallet
          </Button>
        </div>
        {insufficientAllocate && (
          <p className="mt-2 text-sm text-foreground">
            Insufficient wallet balance.{" "}
            <Link href="/wallet" className="text-primary hover:underline">
              Deposit on Wallet
            </Link>{" "}
            first.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                Auto-reinvest (compounding)
              </h4>
              <p className="mt-1 text-xs text-muted">
                {status.settings?.autoReinvestEarnings
                  ? (status.autoReinvestFeePercent ?? 0) > 0
                    ? `On — ${status.autoReinvestFeePercent}% of each daily earning is charged as a fee; the rest compounds into your investment.`
                    : "On — 100% of each daily earning compounds into your investment (no auto-reinvest fee)."
                  : (status.autoReinvestFeePercent ?? 0) > 0
                    ? `Off — daily earnings go to your wallet. Enable to compound after a ${status.autoReinvestFeePercent}% fee.`
                    : "Off — daily earnings go to your wallet. Enable to compound 100% of each daily return into investment."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={
                status.settings?.autoReinvestEarnings ? "secondary" : "default"
              }
              disabled={reinvestLoading}
              onClick={() => {
                const next = !status.settings?.autoReinvestEarnings;
                setReinvestLoading(true);
                setError("");
                void api.investor
                  .setAutoReinvest(next)
                  .then(() => refresh())
                  .catch((e) =>
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Failed to update auto-reinvest",
                    ),
                  )
                  .finally(() => setReinvestLoading(false));
              }}
            >
              {reinvestLoading && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {status.settings?.autoReinvestEarnings
                ? "Turn off"
                : "Enable compounding"}
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ delay: 0.19 }}
        className="xl:col-span-7 xl:col-start-6 xl:row-span-4 xl:row-start-2"
      >
        <InvestmentReturnsPanel
          investmentBalance={status.investmentBalance ?? 0}
          dailyYieldPercent={status.dailyYieldPercent}
          walletEarnings={status.walletEarnings}
          yieldPaused={status.settings?.yieldPaused}
          autoReinvest={status.settings?.autoReinvestEarnings}
          autoReinvestFeePercent={status.autoReinvestFeePercent}
          displayCurrency={display}
        />
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ delay: 0.2 }}
        className="grid gap-3 sm:grid-cols-2 xl:col-span-5 xl:row-start-4 xl:grid-cols-2"
      >
        {[
          {
            label: "Wallet balance",
            value: formatMoney(status.walletBalance, display),
          },
          {
            label: "Daily yield",
            value: `${status.dailyYieldPercent}%`,
          },
          {
            label: "Invested",
            value: formatMoney(status.investmentBalance ?? 0, display),
          },
          {
            label: "Wallet earnings",
            value: formatMoney(status.walletEarnings ?? 0, display),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          >
            <p className="text-xs text-muted">{item.label}</p>
            <p
              className={cn(
                "mt-0.5 font-semibold text-foreground",
                localCurrency ? "text-base" : "text-lg",
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 xl:col-span-5 xl:row-start-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Yield controls
            </h3>
            <p className="mt-1 text-sm text-muted">
              Pause or resume Smart Investment. Prefer the on-chain vault?{" "}
              <Link href="/blockchain" className="text-primary hover:underline">
                Open blockchain contract
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status.settings?.paused ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void api.investor.resume().then(refresh)}
              >
                Resume
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void api.investor.pause().then(refresh)}
              >
                Pause
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {status.recentTrades.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.3 }}
          className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] xl:col-span-12 xl:row-start-6"
        >
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">Recent activity</h3>
          </div>
          <div className="divide-y divide-white/5">
            {status.recentTrades.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-foreground">
                    {t.symbol} {t.direction}
                  </span>
                  <p className="text-xs text-muted">{t.signalId}</p>
                </div>
                <div className="flex items-center gap-3">
                  {t.profit != null && (
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        t.profit >= 0 ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      {t.profit >= 0 ? "+" : ""}
                      {formatCurrency(t.profit)}
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      tradeStatusClass(t.status),
                    )}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}
