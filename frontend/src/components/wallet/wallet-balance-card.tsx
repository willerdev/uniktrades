"use client";

import {
  cn,
  formatMoney,
  formatUsdtHint,
  isLocalCurrencyDisplay,
  type DisplayCurrency,
} from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

type WalletBalanceCardProps = {
  balance: number;
  displayCurrency?: DisplayCurrency | null;
  onWithdraw: () => void;
  onDeposit: () => void;
};

export function WalletBalanceCard({
  balance,
  displayCurrency,
  onWithdraw,
  onDeposit,
}: WalletBalanceCardProps) {
  const usdtHint = formatUsdtHint(balance, displayCurrency);
  const localCurrency = isLocalCurrencyDisplay(displayCurrency);
  const badge =
    displayCurrency?.source === "coinbase" && displayCurrency.code !== "USDT"
      ? displayCurrency.code
      : "USDT";

  const actions = [
    { label: "Deposit", icon: ArrowDownLeft, onClick: onDeposit },
    { label: "Withdraw", icon: ArrowUpRight, onClick: onWithdraw },
  ] as const;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#1d4ed8] to-[#1e3a8a] p-5 shadow-lg shadow-primary/20">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

      <div className="relative">
        <p className="text-xs font-medium text-white/80">
          Current balance{" "}
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] uppercase text-white">
            {badge}
          </span>
        </p>
        <p
          className={cn(
            "mt-1 font-bold tracking-tight text-white",
            localCurrency ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl",
          )}
        >
          {formatMoney(balance, displayCurrency)}
        </p>
        {usdtHint && (
          <p className="mt-0.5 text-xs text-white/70">{usdtHint}</p>
        )}
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-2">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-1.5 rounded-xl py-2 transition-colors hover:bg-white/10"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
              <Icon className="h-5 w-5 text-white" />
            </span>
            <span className="text-[11px] font-medium text-white/90">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
