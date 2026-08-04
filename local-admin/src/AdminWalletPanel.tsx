import { useState } from "react";
import { api } from "./api";

function fmtMoney(n: number | string | null | undefined) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "—";
}

type Props = {
  onMessage: (msg: string) => void;
  showSensitiveFinance: boolean;
};

export function AdminWalletPanel({ onMessage, showSensitiveFinance }: Props) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [preview, setPreview] = useState<{
    email: string;
    displayName: string;
    balance: number;
  } | null>(null);

  async function lookupUser() {
    const q = email.trim();
    if (!q) {
      onMessage("Enter a user email to look up");
      return;
    }
    setLookupLoading(true);
    setPreview(null);
    try {
      const res = await api.users({ search: q, limit: 10 });
      const match =
        res.items.find(
          (u) => u.email?.toLowerCase() === q.toLowerCase(),
        ) ?? res.items[0];
      if (!match) {
        onMessage("No user found for that email");
        return;
      }
      setPreview({
        email: match.email,
        displayName: match.displayName || match.email,
        balance: Number(match.walletBalance ?? 0),
      });
      if (match.email.toLowerCase() !== q.toLowerCase()) {
        setEmail(match.email);
      }
      onMessage(
        `${match.displayName || match.email} — balance ${fmtMoney(match.walletBalance)}`,
      );
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }

  async function submit() {
    const trimmed = email.trim();
    const amt = Number(amount);
    if (!trimmed) {
      onMessage("Enter a user email");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      onMessage("Enter a valid amount greater than 0");
      return;
    }
    if (mode === "withdraw" && preview && amt > preview.balance) {
      onMessage(
        `Insufficient balance — available ${fmtMoney(preview.balance)}`,
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: trimmed,
        amount: amt,
        description: note.trim() || undefined,
      };
      const res =
        mode === "deposit"
          ? await api.creditUserWallet(payload)
          : await api.debitUserWallet(payload);

      onMessage(
        `${mode === "deposit" ? "Deposited" : "Withdrew"} ${fmtMoney(res.amount)} ${
          mode === "deposit" ? "to" : "from"
        } ${res.displayName} — balance ${fmtMoney(res.balance)}.` +
          (res.emailSent ? " Email sent." : " Email NOT sent (check Resend)."),
      );
      setPreview({
        email: res.email ?? trimmed,
        displayName: res.displayName,
        balance: res.balance,
      });
      setAmount("");
      setNote("");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Wallet update failed");
    } finally {
      setLoading(false);
    }
  }

  if (!showSensitiveFinance) {
    return (
      <section>
        <h2>Wallet</h2>
        <p className="muted">
          Deposit and withdraw controls are hidden for this admin account.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Wallet</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Deposit USDT into a user&apos;s platform wallet, or withdraw (debit)
        available balance. Full admins only — this adjusts the ledger directly
        and does not create a crypto payout.
      </p>

      <div className="kyc-card" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <button
            type="button"
            className={mode === "deposit" ? "primary" : undefined}
            onClick={() => setMode("deposit")}
          >
            Deposit
          </button>
          <button
            type="button"
            className={mode === "withdraw" ? "primary" : undefined}
            onClick={() => setMode("withdraw")}
          >
            Withdraw
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "end",
          }}
        >
          <label>
            <span className="muted" style={{ display: "block", fontSize: "0.75rem" }}>
              User email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setPreview(null);
              }}
              placeholder="trader@example.com"
              style={{ minWidth: "16rem" }}
            />
          </label>
          <button
            type="button"
            disabled={lookupLoading || !email.trim()}
            onClick={() => void lookupUser()}
          >
            {lookupLoading ? "Looking up…" : "Look up"}
          </button>
          <label>
            <span className="muted" style={{ display: "block", fontSize: "0.75rem" }}>
              Amount (USDT)
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "8rem" }}
            />
          </label>
          <label>
            <span className="muted" style={{ display: "block", fontSize: "0.75rem" }}>
              Note (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                mode === "deposit" ? "Bonus, correction…" : "Adjustment, clawback…"
              }
              style={{ minWidth: "14rem" }}
            />
          </label>
          <button
            type="button"
            className="primary"
            disabled={loading || !email.trim() || !amount}
            onClick={() => void submit()}
          >
            {loading
              ? mode === "deposit"
                ? "Depositing…"
                : "Withdrawing…"
              : mode === "deposit"
                ? "Deposit"
                : "Withdraw"}
          </button>
        </div>

        {preview && (
          <p style={{ margin: "0.85rem 0 0" }}>
            <strong>{preview.displayName}</strong>
            <span className="muted"> · {preview.email}</span>
            <br />
            Available balance: <strong>{fmtMoney(preview.balance)}</strong>
          </p>
        )}

        {mode === "withdraw" && (
          <p className="muted" style={{ margin: "0.75rem 0 0", fontSize: "0.85rem" }}>
            Withdraw fails if the amount exceeds the user&apos;s available
            balance. Locked / invested funds are not touched.
          </p>
        )}
      </div>
    </section>
  );
}
