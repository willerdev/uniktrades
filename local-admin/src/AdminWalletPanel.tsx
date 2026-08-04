import { useCallback, useEffect, useState } from "react";
import {
  api,
  type CustodyDepositCreated,
  type CustodyDepositRow,
  type NowPaymentsWalletSummary,
} from "./api";
import { STATIC_NOWPAYMENTS_BALANCE_LABEL } from "./Sidebar";

function fmtMoney(n: number | string | null | undefined) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "—";
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

type Sheet = "none" | "deposit" | "withdraw";

type Props = {
  onMessage: (msg: string) => void;
  showSensitiveFinance: boolean;
};

export function AdminWalletPanel({ onMessage, showSensitiveFinance }: Props) {
  const [wallet, setWallet] = useState<NowPaymentsWalletSummary | null>(null);
  const [deposits, setDeposits] = useState<CustodyDepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [amount, setAmount] = useState("100");
  const [network, setNetwork] = useState("TRC20");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<CustodyDepositCreated | null>(
    null,
  );
  const [pendingPayoutId, setPendingPayoutId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");

  const refresh = useCallback(async (sync = false) => {
    setLoading(true);
    try {
      const [w, d] = await Promise.all([
        api.nowPaymentsWallet(),
        api.custodyDeposits(20, sync),
      ]);
      setWallet(w);
      setDeposits(d.items);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const balanceLabel = showSensitiveFinance
    ? fmtMoney(wallet?.usdtBalance)
    : STATIC_NOWPAYMENTS_BALANCE_LABEL;

  async function submitDeposit() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      onMessage("Enter a valid deposit amount");
      return;
    }
    setBusy(true);
    try {
      const res = await api.createCustodyDeposit(amt, network);
      setActiveDeposit(res);
      onMessage(res.message);
      await refresh(false);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitWithdraw() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      onMessage("Enter a valid withdraw amount");
      return;
    }
    if (address.trim().length < 10) {
      onMessage("Enter a destination wallet address");
      return;
    }
    setBusy(true);
    try {
      const res = await api.createCustodyWithdraw(amt, address.trim(), network);
      setPendingPayoutId(res.payoutId);
      onMessage(res.message);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitVerify() {
    if (!pendingPayoutId || !verifyCode.trim()) {
      onMessage("Enter the NOWPayments verification code");
      return;
    }
    setBusy(true);
    try {
      const res = await api.verifyCustodyWithdraw(
        pendingPayoutId,
        verifyCode.trim(),
      );
      onMessage(res.message);
      setPendingPayoutId(null);
      setVerifyCode("");
      setAddress("");
      setSheet("none");
      await refresh(false);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  function openSheet(next: Sheet) {
    setSheet(next);
    setActiveDeposit(null);
    setPendingPayoutId(null);
    setVerifyCode("");
    if (next === "deposit") setAmount("100");
    if (next === "withdraw") setAmount("");
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      onMessage("Copied to clipboard");
    } catch {
      onMessage("Could not copy");
    }
  }

  if (!showSensitiveFinance) {
    return (
      <section className="wallet-app">
        <div className="wallet-hero">
          <p className="wallet-hero-label">Available balance</p>
          <p className="wallet-hero-balance">{STATIC_NOWPAYMENTS_BALANCE_LABEL}</p>
          <p className="wallet-hero-sub muted">
            Sensitive wallet controls are hidden for this admin account.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="wallet-app">
      <div className="wallet-hero">
        <div className="wallet-hero-top">
          <div>
            <p className="wallet-hero-label">Custody wallet</p>
            <h2 className="wallet-hero-title">USDT</h2>
          </div>
          <button
            type="button"
            className="wallet-icon-btn"
            disabled={loading}
            onClick={() => void refresh(true)}
            title="Refresh"
          >
            {loading ? "…" : "↻"}
          </button>
        </div>

        <p className="wallet-hero-balance">{loading && !wallet ? "—" : balanceLabel}</p>
        <p className="wallet-hero-sub">
          {wallet?.configured === false
            ? wallet.message ?? "NOWPayments not configured"
            : wallet?.pendingCryptoPayoutCount
              ? `${wallet.pendingCryptoPayoutCount} pending payout${wallet.pendingCryptoPayoutCount === 1 ? "" : "s"} · ${fmtMoney(wallet.pendingCryptoPayoutTotal)}`
              : "Ready for deposits & withdrawals"}
        </p>

        <div className="wallet-actions">
          <button
            type="button"
            className="wallet-action wallet-action-in"
            disabled={!wallet?.configured}
            onClick={() => openSheet("deposit")}
          >
            <span className="wallet-action-icon">↓</span>
            Deposit
          </button>
          <button
            type="button"
            className="wallet-action wallet-action-out"
            disabled={!wallet?.configured || wallet?.payoutConfigured === false}
            onClick={() => openSheet("withdraw")}
          >
            <span className="wallet-action-icon">↑</span>
            Withdraw
          </button>
        </div>

        {wallet?.configured && wallet.payoutConfigured === false && (
          <p className="wallet-warn">{wallet.message}</p>
        )}
      </div>

      {sheet !== "none" && (
        <div className="wallet-sheet">
          <div className="wallet-sheet-head">
            <h3>{sheet === "deposit" ? "Deposit USDT" : "Withdraw USDT"}</h3>
            <button type="button" className="wallet-icon-btn" onClick={() => openSheet("none")}>
              ✕
            </button>
          </div>

          {sheet === "deposit" && !activeDeposit && (
            <>
              <label className="wallet-field">
                <span>Amount</span>
                <div className="wallet-amount-row">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="wallet-amount-unit">USDT</span>
                </div>
              </label>
              <div className="wallet-chips">
                {["50", "100", "250", "500"].map((v) => (
                  <button key={v} type="button" onClick={() => setAmount(v)}>
                    ${v}
                  </button>
                ))}
              </div>
              <label className="wallet-field">
                <span>Network</span>
                <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                  <option value="TRC20">TRC20</option>
                  <option value="BEP20">BEP20</option>
                  <option value="ERC20">ERC20</option>
                </select>
              </label>
              <button
                type="button"
                className="wallet-primary"
                disabled={busy}
                onClick={() => void submitDeposit()}
              >
                {busy ? "Creating…" : "Continue"}
              </button>
            </>
          )}

          {sheet === "deposit" && activeDeposit?.payAddress && (
            <div className="wallet-pay">
              <p className="muted">
                Send exactly{" "}
                <strong>
                  {activeDeposit.payAmount} {activeDeposit.payCurrency}
                </strong>
              </p>
              <code className="wallet-address">{activeDeposit.payAddress}</code>
              <div className="wallet-sheet-actions">
                <button
                  type="button"
                  onClick={() => void copyText(activeDeposit.payAddress!)}
                >
                  Copy address
                </button>
                {activeDeposit.invoiceUrl && (
                  <a href={activeDeposit.invoiceUrl} target="_blank" rel="noreferrer">
                    Open invoice
                  </a>
                )}
              </div>
            </div>
          )}

          {sheet === "withdraw" && !pendingPayoutId && (
            <>
              <label className="wallet-field">
                <span>Amount</span>
                <div className="wallet-amount-row">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="wallet-amount-unit">USDT</span>
                </div>
              </label>
              <label className="wallet-field">
                <span>Network</span>
                <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                  <option value="TRC20">TRC20</option>
                  <option value="BEP20">BEP20</option>
                  <option value="ERC20">ERC20</option>
                </select>
              </label>
              <label className="wallet-field">
                <span>Destination address</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Paste wallet address"
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                className="wallet-primary"
                disabled={busy}
                onClick={() => void submitWithdraw()}
              >
                {busy ? "Sending…" : "Withdraw"}
              </button>
            </>
          )}

          {sheet === "withdraw" && pendingPayoutId && (
            <>
              <p className="muted">
                Confirm with the code NOWPayments emailed / showed for this payout.
              </p>
              <label className="wallet-field">
                <span>Verification code</span>
                <input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                />
              </label>
              <button
                type="button"
                className="wallet-primary"
                disabled={busy || !verifyCode.trim()}
                onClick={() => void submitVerify()}
              >
                {busy ? "Confirming…" : "Confirm withdrawal"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="wallet-activity">
        <div className="wallet-activity-head">
          <h3>Recent deposits</h3>
          <button type="button" disabled={loading} onClick={() => void refresh(true)}>
            Sync
          </button>
        </div>
        {deposits.length === 0 ? (
          <p className="muted wallet-empty">No deposits yet. Tap Deposit to fund the wallet.</p>
        ) : (
          <ul className="wallet-tx-list">
            {deposits.map((d) => (
              <li key={d.id} className="wallet-tx">
                <div className="wallet-tx-icon in">↓</div>
                <div className="wallet-tx-body">
                  <strong>Deposit · {d.network}</strong>
                  <span className="muted">{fmtDate(d.createdAt)}</span>
                </div>
                <div className="wallet-tx-right">
                  <strong>+{fmtMoney(d.amount)}</strong>
                  <span className={`wallet-pill ${d.status.toLowerCase()}`}>
                    {d.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
