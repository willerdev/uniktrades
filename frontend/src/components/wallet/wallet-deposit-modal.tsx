"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import {
  MomoPaymentFields,
  formatLocalAmount,
} from "@/components/payments/momo-payment-fields";
import { useFlutterwaveConfig } from "@/hooks/use-flutterwave-config";

const NETWORKS = [
  { id: "TRC20", label: "TRC20", hint: "Lowest fees" },
  { id: "BEP20", label: "BEP20", hint: "Fast" },
  { id: "ERC20", label: "ERC20", hint: "Higher gas" },
] as const;

type Step = "amount" | "network" | "pay" | "done";
type DepositMethod = "crypto" | "momo";
type Progress = "waiting" | "confirming" | "partial" | "complete" | "failed";

const PROGRESS_LABEL: Record<Progress, string> = {
  waiting: "Waiting for transfer",
  confirming: "Confirming on chain",
  partial: "Partial payment received",
  complete: "Deposit confirmed",
  failed: "Payment failed",
};

export function WalletDepositModal({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("10");
  const [network, setNetwork] = useState("TRC20");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [payAddress, setPayAddress] = useState("");
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>("waiting");
  const [copied, setCopied] = useState(false);
  const [depositMin, setDepositMin] = useState(10);
  const [depositMethod, setDepositMethod] = useState<DepositMethod>("crypto");
  const { config: flwConfig, momoEnabled } = useFlutterwaveConfig();
  const [momoPhone, setMomoPhone] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("MTN");
  const [momoInstruction, setMomoInstruction] = useState("");

  const reset = useCallback(() => {
    setStep("amount");
    setAmount("10");
    setNetwork("TRC20");
    setLoading(false);
    setError("");
    setPaymentId(null);
    setPayAddress("");
    setPayAmount(null);
    setProgress("waiting");
    setDepositMethod("crypto");
    setMomoPhone("");
    setMomoNetwork("MTN");
    setMomoInstruction("");
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open || depositMethod !== "crypto") return;
    let cancelled = false;
    void api.wallet
      .depositMinimum(network)
      .then((m) => {
        if (cancelled) return;
        setDepositMin(m.minUsdt);
        setAmount((prev) => {
          const n = Number(prev);
          return !Number.isFinite(n) || n < m.minUsdt
            ? String(m.minUsdt)
            : prev;
        });
      })
      .catch(() => {
        if (!cancelled) setDepositMin(10);
      });
    return () => {
      cancelled = true;
    };
  }, [open, network, depositMethod]);

  useEffect(() => {
    if (!open || depositMethod !== "momo" || !momoEnabled || !flwConfig) return;
    const min = flwConfig.minDepositUsd;
    setDepositMin(min);
    setAmount((prev) => {
      const n = Number(prev);
      return !Number.isFinite(n) || n < min ? String(min) : prev;
    });
  }, [open, depositMethod, flwConfig, momoEnabled]);

  const pollStatus = useCallback(async () => {
    if (!paymentId) return;
    try {
      const status = await api.payments.getStatus(paymentId);
      if (status.payAddress) setPayAddress(status.payAddress);
      if (status.payAmount != null) setPayAmount(status.payAmount);
      const p = (status.progress as Progress) || "waiting";
      setProgress(p);
      if (status.confirmed) {
        setStep("done");
        onComplete?.();
      }
    } catch {
      /* polling */
    }
  }, [paymentId, onComplete]);

  useEffect(() => {
    if (!paymentId || step === "done") return;
    const t = setInterval(() => void pollStatus(), 8000);
    void pollStatus();
    return () => clearInterval(t);
  }, [paymentId, step, pollStatus]);

  async function createPayment() {
    setError("");
    setLoading(true);
    try {
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount < depositMin) {
        throw new Error(
          `Minimum deposit is ${formatCurrency(depositMin)} USDT${
            depositMethod === "crypto" ? ` on ${network}` : ""
          }`,
        );
      }
      if (depositMethod === "crypto" && !network) {
        throw new Error("Choose a network");
      }
      if (depositMethod === "momo" && momoPhone.trim().length < 8) {
        throw new Error("Enter a valid MoMo phone number");
      }

      const res = await api.wallet.deposit(
        depositMethod === "momo"
          ? {
              method: "momo",
              amount: numAmount,
              momoPhone: momoPhone.trim(),
              momoNetwork,
              momoCountryCode: flwConfig?.countryCode,
            }
          : {
              method: "crypto",
              network,
              amount: numAmount,
            },
      );

      if (!res.paymentId) {
        throw new Error("Could not start deposit — try again");
      }

      if (depositMethod === "crypto" && !res.payAddress) {
        throw new Error(
          res.message ||
            "No deposit address returned — crypto payments may be unavailable. Try again or contact support.",
        );
      }

      setPaymentId(res.paymentId);
      setPayAddress(res.payAddress ?? "");
      setPayAmount(res.payAmount ?? res.amount ?? numAmount);
      setMomoInstruction(res.instruction ?? "");
      setStep("pay");
      setProgress("waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start deposit");
    } finally {
      setLoading(false);
    }
  }

  async function copyAddress() {
    if (!payAddress) return;
    try {
      await navigator.clipboard.writeText(payAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the address manually");
    }
  }

  if (!open) return null;

  const stepLabels =
    depositMethod === "momo"
      ? ["Amount", "Pay", "Done"]
      : ["Amount", "Network", "Pay", "Done"];

  return (
    <div
      className="modal-overlay fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="modal-panel w-full max-w-lg rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {depositMethod === "momo" ? "Deposit via MoMo" : "Deposit USDT"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {step === "done"
              ? "Deposit complete"
              : step === "pay"
                ? depositMethod === "momo"
                  ? "Approve on your phone"
                  : "Send crypto to the address below"
                : step === "network"
                  ? "Choose your network"
                  : "Enter amount to add to your wallet"}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {stepLabels.join(" → ")}
          </p>
        </div>

        <div className="space-y-4 p-5">
          {step === "amount" && (
            <>
              {momoEnabled && flwConfig && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDepositMethod("crypto")}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium",
                      depositMethod === "crypto"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-[var(--color-border)] text-muted",
                    )}
                  >
                    USDT crypto
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositMethod("momo")}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium",
                      depositMethod === "momo"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-[var(--color-border)] text-muted",
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                    MoMo
                  </button>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Amount (USDT) — minimum {formatCurrency(depositMin)}
                  {depositMethod === "crypto" ? ` on ${network}` : ""}
                </label>
                <Input
                  type="number"
                  min={depositMin}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg font-semibold text-foreground"
                />
                {depositMethod === "momo" && momoEnabled && flwConfig && (
                  <p className="mt-1 text-xs text-primary">
                    ≈{" "}
                    {formatLocalAmount(
                      Number(amount) || 0,
                      flwConfig.usdRate,
                      flwConfig.currency,
                    )}{" "}
                    charged on your phone
                  </p>
                )}
              </div>
              {depositMethod === "momo" && momoEnabled && flwConfig && (
                <MomoPaymentFields
                  phone={momoPhone}
                  onPhoneChange={setMomoPhone}
                  network={momoNetwork}
                  onNetworkChange={setMomoNetwork}
                  config={flwConfig}
                />
              )}
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button
                type="button"
                className="w-full"
                onClick={() =>
                  depositMethod === "momo"
                    ? void createPayment()
                    : setStep("network")
                }
                disabled={
                  !amount ||
                  Number(amount) < depositMin ||
                  loading ||
                  (depositMethod === "momo" && momoPhone.length < 8)
                }
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {depositMethod === "momo" ? "Send MoMo prompt" : "Continue"}
              </Button>
            </>
          )}

          {step === "network" && depositMethod === "crypto" && (
            <>
              <div className="grid gap-2">
                {NETWORKS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNetwork(n.id)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      network === n.id
                        ? "border-primary bg-primary/10"
                        : "border-[var(--color-border)] hover:border-primary/40",
                    )}
                  >
                    <span className="font-medium text-foreground">{n.label}</span>
                    <span className="ml-2 text-xs text-muted">{n.hint}</span>
                  </button>
                ))}
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setError("");
                    setStep("amount");
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => void createPayment()}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate address
                </Button>
              </div>
            </>
          )}

          {(step === "pay" || step === "done") && (
            <>
              {step === "done" ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success" />
                  <p className="text-sm font-medium text-foreground">
                    Deposit confirmed — balance updated
                  </p>
                  <Button type="button" onClick={onClose}>
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="gold">{PROGRESS_LABEL[progress]}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void pollStatus()}
                      className="gap-1 text-muted"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </Button>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    {depositMethod === "momo" ? (
                      <>
                        <p className="text-xs uppercase tracking-wide text-muted">
                          Approve on your phone
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {momoInstruction ||
                            "Check your phone for the Mobile Money prompt and enter your PIN to approve."}
                        </p>
                        <p className="mt-3 text-xs text-muted">
                          {formatCurrency(Number(amount))} USDT
                          {momoEnabled &&
                            flwConfig &&
                            ` (≈ ${formatLocalAmount(Number(amount), flwConfig.usdRate, flwConfig.currency)})`}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs uppercase tracking-wide text-muted">
                          Send exactly
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {Number(payAmount ?? amount).toFixed(6)} USDT
                        </p>
                        <p className="text-xs text-muted">Network: {network}</p>
                        {payAddress ? (
                          <>
                            <p className="mt-3 break-all font-mono text-xs text-primary">
                              {payAddress}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="mt-2 gap-1"
                              onClick={() => void copyAddress()}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copied ? "Copied!" : "Copy address"}
                            </Button>
                          </>
                        ) : (
                          <p className="mt-3 text-sm text-danger">
                            Address missing — go back and generate again.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {error && <p className="text-sm text-danger">{error}</p>}
                  <p className="text-xs text-muted">
                    We check automatically every few seconds. Keep this window
                    open until the deposit confirms.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setError("");
                      setPaymentId(null);
                      setPayAddress("");
                      setStep(depositMethod === "momo" ? "amount" : "network");
                    }}
                  >
                    Start over
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
