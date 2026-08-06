"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type WalletLedgerItem, type WalletSummary } from "@/lib/api";
import { WalletBalanceCard } from "@/components/wallet/wallet-balance-card";
import { WalletDepositModal } from "@/components/wallet/wallet-deposit-modal";
import { WalletWithdrawModal } from "@/components/wallet/wallet-withdraw-modal";
import { WalletSavedWithdrawalWallets } from "@/components/wallet/wallet-saved-withdrawal-wallets";
import { formatCurrency } from "@/lib/utils";
import { AuthLoadingScreen, useRequireAuth } from "@/hooks/use-require-auth";
import { syncApiAuthToken, useAuthStore } from "@/stores/auth";
import { Loader2, RefreshCw } from "lucide-react";

export default function WalletPage() {
  const { ready } = useRequireAuth();
  const token = useAuthStore((s) => s.token);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [txs, setTxs] = useState<WalletLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const refresh = useCallback(async () => {
    const authToken = syncApiAuthToken();
    if (!authToken) {
      setError("Session not ready — log out and sign in again.");
      setSummary(null);
      setTxs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([
        api.wallet.summary(),
        api.wallet.transactions(),
      ]);
      setSummary(s);
      setTxs(t.items);
    } catch (err) {
      setSummary(null);
      setTxs([]);
      setError(
        err instanceof Error ? err.message : "Could not load wallet balance",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    void refresh();
  }, [ready, token, refresh]);

  if (!ready) return <AuthLoadingScreen />;

  if (loading && !summary && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 sm:max-w-xl sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="mt-1 text-sm text-muted">
            Deposit USDT or withdraw to a saved wallet.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh wallet"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {summary && (
        <WalletBalanceCard
          balance={summary.availableBalance}
          displayCurrency={summary.displayCurrency}
          onWithdraw={() => setWithdrawOpen(true)}
          onDeposit={() => setDepositOpen(true)}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => setDepositOpen(true)}
          disabled={!summary}
        >
          Deposit
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="w-full"
          onClick={() => setWithdrawOpen(true)}
          disabled={!summary}
        >
          Withdraw
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">
            Withdrawal wallets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WalletSavedWithdrawalWallets />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {txs.length === 0 ? (
            <p className="text-sm text-muted">
              {summary ? "No transactions yet." : "Transactions unavailable."}
            </p>
          ) : (
            txs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {tx.description}
                  </p>
                  <p className="text-[10px] text-muted">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={
                    tx.amount >= 0
                      ? "text-sm font-bold text-success"
                      : "text-sm font-bold text-danger"
                  }
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <WalletDepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        onComplete={() => void refresh()}
      />
      <WalletWithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableBalance={summary?.availableBalance ?? 0}
        feeUsdt={summary?.withdrawalFeeUsdt ?? 3}
        schedule={
          summary
            ? {
                scheduleEnabled: summary.withdrawalScheduleEnabled,
                preferredSchedule: summary.withdrawalPreferredSchedule,
                offSchedulePenaltyPercent:
                  summary.withdrawalOffSchedulePenaltyPercent,
                inPreferredWindow: summary.withdrawalInPreferredWindow,
                preferredWindowLabel: summary.withdrawalPreferredWindowLabel,
                nextPreferredWindowAt: summary.withdrawalNextPreferredWindowAt,
              }
            : undefined
        }
        onComplete={() => void refresh()}
      />
    </div>
  );
}
