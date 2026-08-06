"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
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
  PaymentSourceSelector,
  type PaymentSource,
} from "@/components/wallet/payment-source-selector";
import {
  cn,
  formatCurrency,
  formatMoney,
  isLocalCurrencyDisplay,
} from "@/lib/utils";
import { DailyCreditTimeText } from "@/components/daily-credit-time-text";

const NETWORKS = ["TRC20", "BEP20", "ERC20"] as const;

/** Enrollment fee waived — amount must still be in range. */
function resolveFeeClient(amount: number): number | null {
  if (!Number.isFinite(amount) || amount < 100 || amount > 5000) return null;
  return 0;
}

type Progress = "waiting" | "confirming" | "complete" | "failed";

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
                Auto-reinvest on ({autoReinvestFeePercent ?? 10}% fee)
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
  const [source, setSource] = useState<PaymentSource>("wallet");
  const [network, setNetwork] = useState("TRC20");
  const [walletBalance, setWalletBalance] = useState(0);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<{
    payAddress?: string;
    payAmount?: number;
    paymentId?: string;
  } | null>(null);
  const [progress, setProgress] = useState<Progress>("waiting");
  const [copied, setCopied] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    async function restorePending() {
      try {
        const res = await api.investor.pendingEnrollment();
        if (cancelled || res.active || !res.pending?.payAddress || !res.pending.paymentId) {
          return;
        }
        setSource("crypto");
        if (res.pending.network) setNetwork(res.pending.network);
        if (res.pending.investmentAmount != null) {
          setInvestmentAmount(String(res.pending.investmentAmount));
        }
        setCheckout({
          payAddress: res.pending.payAddress,
          payAmount: res.pending.payAmount ?? res.pending.amount,
          paymentId: res.pending.paymentId,
        });
        setProgress("waiting");
      } catch {
        /* no pending enrollment */
      }
    }
    void restorePending();
    return () => {
      cancelled = true;
    };
  }, []);

  const pollStatus = useCallback(async () => {
    if (!checkout?.paymentId) return;
    try {
      const s = await api.payments.getStatus(checkout.paymentId);
      setProgress((s.progress as Progress) || "waiting");
      if (s.confirmed) {
        setProgress("complete");
        await refresh();
      }
    } catch {
      /* polling */
    }
  }, [checkout?.paymentId, refresh]);

  useEffect(() => {
    if (!checkout?.paymentId || progress === "complete") return;
    const t = setInterval(() => void pollStatus(), 8000);
    void pollStatus();
    return () => clearInterval(t);
  }, [checkout?.paymentId, progress, pollStatus]);

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
      const paySource = source === "wallet" ? "wallet" : "crypto";
      const res = await api.investor.enrollCheckout(network, paySource, amount);
      if (res.active || res.success) {
        await refresh();
        setCheckout(null);
        return;
      }
      if (!res.payAddress || !res.paymentId) {
        throw new Error(res.message || "Could not start enrollment");
      }
      setCheckout({
        payAddress: res.payAddress,
        payAmount: res.payAmount ?? res.amount,
        paymentId: res.paymentId,
      });
      setProgress("waiting");
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
              Deposit from ${investmentMin} USDT with no enrollment fee. Earn{" "}
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
                { icon: Shield, text: "No enrollment fee" },
                { icon: Wallet, text: "Credits to platform wallet" },
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
                Minimum deposit{" "}
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
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        >
          {checkout?.payAddress ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={progress === "complete" ? "success" : "gold"}>
                  {progress === "complete"
                    ? "Enrollment confirmed"
                    : progress === "confirming"
                      ? "Confirming on chain"
                      : "Waiting for transfer"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void pollStatus()}
                  className="gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
              {progress === "complete" ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm">Investor program activated</span>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-[var(--color-border)] bg-background p-4">
                    <p className="text-sm text-foreground">
                      Send exactly{" "}
                      <strong className="font-semibold text-foreground">
                        {Number(checkout.payAmount ?? depositDue).toFixed(6)} USDT
                      </strong>{" "}
                      on{" "}
                      <strong className="font-semibold text-foreground">
                        {network}
                      </strong>{" "}
                      to:
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(checkout.payAddress)}`}
                      alt="Payment QR code"
                      width={180}
                      height={180}
                      className="mx-auto mt-3 rounded-lg border border-[var(--color-border)] bg-white p-2"
                    />
                    <code className="mt-3 block break-all rounded-lg border border-[var(--color-border)] bg-foreground/[0.04] p-3 font-mono text-xs text-foreground">
                      {checkout.payAddress}
                    </code>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1"
                      onClick={async () => {
                        if (!checkout.payAddress) return;
                        try {
                          await navigator.clipboard.writeText(checkout.payAddress);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } catch {
                          setError("Could not copy — select the address manually");
                        }
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "Copied!" : "Copy address"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCheckout(null);
                        setProgress("waiting");
                        setError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-muted">
                    After payment confirms, the full{" "}
                    {formatCurrency(netInvested || parsedInvestment)} is invested
                    automatically (no enrollment fee). Keep this page open or
                    reload — your invoice is restored if you leave.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-muted">
                  Investment amount (USDT)
                </label>
                <Input
                  type="number"
                  min={investmentMin}
                  max={investmentMax}
                  step="1"
                  placeholder={`Enter amount (min ${formatCurrency(investmentMin)})`}
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-muted">
                  {hasValidParsed ? (
                    <>
                      Deposit{" "}
                      <strong className="text-foreground">
                        {formatCurrency(depositDue)}
                      </strong>
                      {" — "}
                      <strong className="text-emerald-700">
                        $0 enrollment fee
                      </strong>
                      ,{" "}
                      <strong className="text-foreground">
                        {formatCurrency(netInvested || depositDue)}
                      </strong>{" "}
                      invested · earn {status?.dailyYieldPercent ?? 5}% daily
                    </>
                  ) : (
                    <>
                      Choose any amount from{" "}
                      <strong className="text-foreground">
                        {formatCurrency(investmentMin)}
                      </strong>
                      {" – "}
                      <strong className="text-foreground">
                        {formatCurrency(investmentMax)}
                      </strong>
                      {" · "}
                      <strong className="text-emerald-700">
                        $0 enrollment fee
                      </strong>
                      {" · earn "}
                      {status?.dailyYieldPercent ?? 5}% daily
                    </>
                  )}
                </p>
              </div>
              <PaymentSourceSelector
                walletBalance={walletBalance}
                amountDue={depositDue}
                source={source}
                onSourceChange={setSource}
              />
              {source === "crypto" && (
                <div className="flex flex-wrap gap-2">
                  {NETWORKS.map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={network === n ? "default" : "secondary"}
                      onClick={() => setNetwork(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              )}
              {source === "wallet" && walletBalance < depositDue && (
                <p className="text-sm text-muted">
                  <Link href="/wallet" className="text-primary hover:underline">
                    Deposit to wallet
                  </Link>{" "}
                  at least {formatCurrency(depositDue)} to start.
                </p>
              )}
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button
                type="button"
                className="w-full sm:w-auto"
                size="lg"
                onClick={() => void enroll()}
                disabled={payLoading}
              >
                {payLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {hasValidParsed
                  ? `Invest ${formatCurrency(depositDue)}`
                  : "Invest"}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const display = status.displayCurrency;
  const vip = status.vip;
  const localCurrency = isLocalCurrencyDisplay(display);

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
            Need {formatCurrency(vip?.feeUsdt ?? 50)} in wallet to upgrade.
          </p>
        )}
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ delay: 0.18 }}
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 xl:col-span-5 xl:row-start-3"
      >
        <h3 className="text-sm font-semibold text-foreground">Move funds</h3>
        <p className="mt-1 text-xs text-muted">
          Wallet {formatMoney(status.walletBalance, display)} · Investment{" "}
          {formatMoney(status.investmentBalance ?? 0, display)}. Daily yield only
          applies to capital that has been invested for at least 24 hours.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs text-muted">Amount (USDT)</label>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={transferLoading}
            onClick={() => {
              const amount = Number(transferAmount);
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
            Wallet → Investment
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={transferLoading}
            onClick={() => {
              const amount = Number(transferAmount);
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
            Investment → Wallet
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                Auto-reinvest (compounding)
              </h4>
              <p className="mt-1 text-xs text-muted">
                {status.settings?.autoReinvestEarnings
                  ? `On — ${status.autoReinvestFeePercent ?? 10}% of each daily earning is charged as a fee; the remaining 90% compounds into your investment.`
                  : `Off — daily earnings go to your wallet. Enable to compound: ${status.autoReinvestFeePercent ?? 10}% fee on the full daily return, 90% added to investment.`}
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
