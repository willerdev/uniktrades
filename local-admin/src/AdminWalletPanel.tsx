import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type CustodyDepositCreated,
  type CustodyDepositRow,
  type CustodyWithdrawRow,
  type NowPaymentsWalletSummary,
} from "./api";
import { STATIC_CUSTODY_BALANCE_LABEL } from "./Sidebar";

function fmtMoney(n: number | string | null | undefined) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "—";
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

type Sheet = "none" | "deposit" | "withdraw";

type ActivityItem =
  | { kind: "deposit"; at: string; row: CustodyDepositRow }
  | { kind: "withdraw"; at: string; row: CustodyWithdrawRow };

type Props = {
  onMessage: (msg: string) => void;
  showSensitiveFinance: boolean;
};

export function AdminWalletPanel({ onMessage, showSensitiveFinance }: Props) {
  const [wallet, setWallet] = useState<NowPaymentsWalletSummary | null>(null);
  const [deposits, setDeposits] = useState<CustodyDepositRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<CustodyWithdrawRow[]>([]);
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

  const refresh = useCallback(
    async (sync = false) => {
      setLoading(true);
      try {
        const [w, d, wd] = await Promise.all([
          api.nowPaymentsWallet(),
          api.custodyDeposits(40, sync),
          api.custodyWithdrawals(40).catch(() => ({ items: [] })),
        ]);
        setWallet(w);
        setDeposits(d.items);
        setWithdrawals(wd.items);
      } catch (err) {
        onMessage(err instanceof Error ? err.message : "Failed to load wallet");
      } finally {
        setLoading(false);
      }
    },
    [onMessage],
  );

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const platformBalance =
    wallet?.platformUsdtBalance ?? wallet?.usdtBalance ?? 0;

  const balanceLabel = showSensitiveFinance
    ? fmtMoney(platformBalance)
    : STATIC_CUSTODY_BALANCE_LABEL;

  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...deposits.map((row) => ({
        kind: "deposit" as const,
        at: row.createdAt,
        row,
      })),
      ...withdrawals.map((row) => ({
        kind: "withdraw" as const,
        at: row.createdAt,
        row,
      })),
    ];
    return items.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [deposits, withdrawals]);

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
      await refresh(false);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitVerify() {
    if (!pendingPayoutId || !verifyCode.trim()) {
      onMessage("Enter the verification code");
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
          <p className="wallet-hero-balance">{STATIC_CUSTODY_BALANCE_LABEL}</p>
          <p className="wallet-hero-sub muted">
            Sensitive wallet controls are hidden for this admin account.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="wallet-app">
      <header className="wallet-page-head">
        <div>
          <p className="wallet-page-eyebrow">Treasury</p>
          <h2 className="wallet-page-title">Custody wallet</h2>
          <p className="wallet-page-desc muted">
            UnikTrades ledger starts at $0. Balance rises when deposits confirm
            here and falls when you withdraw from this admin.
          </p>
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
      </header>

      <div className="wallet-layout">
        <div className="wallet-main-col">
          <div className="wallet-hero">
            <div className="wallet-hero-top">
              <div>
                <p className="wallet-hero-label">Platform balance · USDT</p>
                <h3 className="wallet-hero-title">Available to use</h3>
              </div>
            </div>

            <p className="wallet-hero-balance">
              {loading && !wallet ? "—" : balanceLabel}
            </p>
            <p className="wallet-hero-sub">
              {wallet?.configured === false
                ? (wallet.message ?? "Crypto payouts not configured")
                : "Deposits and withdrawals on UnikTrades only"}
            </p>

            <div className="wallet-stat-row">
              <div className="wallet-stat">
                <span>Deposited</span>
                <strong>{fmtMoney(wallet?.depositedTotal ?? 0)}</strong>
              </div>
              <div className="wallet-stat">
                <span>Withdrawn</span>
                <strong>{fmtMoney(wallet?.withdrawnTotal ?? 0)}</strong>
              </div>
              <div className="wallet-stat">
                <span>Gateway balance</span>
                <strong>{fmtMoney(wallet?.gatewayUsdtBalance ?? 0)}</strong>
              </div>
            </div>

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
                disabled={
                  !wallet?.configured ||
                  wallet?.payoutConfigured === false ||
                  platformBalance <= 0
                }
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
                <button
                  type="button"
                  className="wallet-icon-btn"
                  onClick={() => openSheet("none")}
                >
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
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                    >
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
                  <code className="wallet-address">
                    {activeDeposit.payAddress}
                  </code>
                  <div className="wallet-sheet-actions">
                    <button
                      type="button"
                      onClick={() => void copyText(activeDeposit.payAddress!)}
                    >
                      Copy address
                    </button>
                    {activeDeposit.invoiceUrl && (
                      <a
                        href={activeDeposit.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open invoice
                      </a>
                    )}
                  </div>
                </div>
              )}

              {sheet === "withdraw" && !pendingPayoutId && (
                <>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Available on this platform: {fmtMoney(platformBalance)}
                  </p>
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
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                    >
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
                    Confirm with the verification code emailed for this payout.
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
        </div>

        <div className="wallet-activity">
          <div className="wallet-activity-head">
            <h3>Activity</h3>
            <button
              type="button"
              disabled={loading}
              onClick={() => void refresh(true)}
            >
              Sync
            </button>
          </div>
          {activity.length === 0 ? (
            <p className="muted wallet-empty">
              No activity yet. Deposit to fund this UnikTrades ledger.
            </p>
          ) : (
            <ul className="wallet-tx-list">
              {activity.map((item) =>
                item.kind === "deposit" ? (
                  <li key={`d-${item.row.id}`} className="wallet-tx">
                    <div className="wallet-tx-icon in">↓</div>
                    <div className="wallet-tx-body">
                      <strong>Deposit · {item.row.network}</strong>
                      <span className="muted">{fmtDate(item.row.createdAt)}</span>
                    </div>
                    <div className="wallet-tx-right">
                      <strong>+{fmtMoney(item.row.amount)}</strong>
                      <span
                        className={`wallet-pill ${item.row.status.toLowerCase()}`}
                      >
                        {item.row.status}
                      </span>
                    </div>
                  </li>
                ) : (
                  <li key={`w-${item.row.id}`} className="wallet-tx">
                    <div className="wallet-tx-icon out">↑</div>
                    <div className="wallet-tx-body">
                      <strong>Withdraw · {item.row.network}</strong>
                      <span className="muted">{fmtDate(item.row.createdAt)}</span>
                    </div>
                    <div className="wallet-tx-right">
                      <strong>−{fmtMoney(item.row.amount)}</strong>
                      <span
                        className={`wallet-pill ${item.row.status.toLowerCase()}`}
                      >
                        {item.row.status}
                      </span>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
