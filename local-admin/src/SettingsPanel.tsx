import { useCallback, useEffect, useState } from "react";
import {
  api,
  type InvestorFeeTier,
  type PlatformRateSettings,
} from "./api";

type Props = {
  onMessage: (msg: string) => void;
};

type Draft = {
  investorDailyYieldPercent: string;
  investorVipDailyYieldPercent: string;
  investorVipFeePercent: string;
  investorAutoReinvestFeePercent: string;
  chainContractMinUsd: string;
  chainContractWithdrawFeePercent: string;
  walletWithdrawalFeeUsdt: string;
  tiers: InvestorFeeTier[];
};

const EMPTY: Draft = {
  investorDailyYieldPercent: "5",
  investorVipDailyYieldPercent: "8",
  investorVipFeePercent: "15",
  investorAutoReinvestFeePercent: "0",
  chainContractMinUsd: "2000",
  chainContractWithdrawFeePercent: "0",
  walletWithdrawalFeeUsdt: "3",
  tiers: [],
};

function toDraft(res: PlatformRateSettings): Draft {
  return {
    investorDailyYieldPercent: String(res.investorDailyYieldPercent),
    investorVipDailyYieldPercent: String(res.investorVipDailyYieldPercent),
    investorVipFeePercent: String(res.investorVipFeePercent),
    investorAutoReinvestFeePercent: String(res.investorAutoReinvestFeePercent),
    chainContractMinUsd: String(res.chainContractMinUsd),
    chainContractWithdrawFeePercent: String(
      res.chainContractWithdrawFeePercent,
    ),
    walletWithdrawalFeeUsdt: String(res.walletWithdrawalFeeUsdt),
    tiers: (res.investorFeeTiers ?? []).map((t) => ({ ...t })),
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      {children}
      {hint ? <span className="settings-field-hint">{hint}</span> : null}
    </label>
  );
}

export function SettingsPanel({ onMessage }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const applyServer = useCallback((res: PlatformRateSettings) => {
    setDraft(toDraft(res));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      applyServer(await api.platformRateSettings());
    } catch (err) {
      onMessage(
        err instanceof Error ? err.message : "Failed to load rate settings",
      );
    } finally {
      setLoading(false);
    }
  }, [applyServer, onMessage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function setNum(key: keyof Draft, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function updateTier(index: number, patch: Partial<InvestorFeeTier>) {
    setDraft((d) => ({
      ...d,
      tiers: d.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  }

  async function save() {
    const num = (s: string, label: string) => {
      const v = Number(s);
      if (!Number.isFinite(v)) throw new Error(`${label} must be a number`);
      return v;
    };
    setSaving(true);
    setSavedFlash(false);
    try {
      const payload = {
        investorDailyYieldPercent: num(
          draft.investorDailyYieldPercent,
          "Non-VIP daily yield",
        ),
        investorVipDailyYieldPercent: num(
          draft.investorVipDailyYieldPercent,
          "VIP daily yield",
        ),
        investorVipFeePercent: num(draft.investorVipFeePercent, "VIP fee %"),
        investorAutoReinvestFeePercent: num(
          draft.investorAutoReinvestFeePercent,
          "Auto-reinvest fee",
        ),
        chainContractMinUsd: num(draft.chainContractMinUsd, "Contract min"),
        chainContractWithdrawFeePercent: num(
          draft.chainContractWithdrawFeePercent,
          "Chain withdraw fee",
        ),
        walletWithdrawalFeeUsdt: num(
          draft.walletWithdrawalFeeUsdt,
          "Wallet withdraw fee",
        ),
        investorFeeTiers: draft.tiers.map((t) => ({
          min: Number(t.min),
          max: Number(t.max),
          fee: Number(t.fee),
          label: t.label,
        })),
      };
      applyServer(await api.updatePlatformRateSettings(payload));
      setSavedFlash(true);
      onMessage("Platform rate settings saved — live on next API read");
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Loading platform rates…</p>
      </div>
    );
  }

  return (
    <div className="panel settings-panel">
      <div className="toolbar" style={{ marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Tweakable yields and fees — changes apply at runtime (no redeploy).
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {savedFlash ? (
            <span className="badge approved">Saved</span>
          ) : null}
          <button type="button" className="btn ghost" onClick={() => void refresh()}>
            Refresh
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <section className="settings-group">
        <h3>Smart Invest</h3>
        <p className="muted settings-group-blurb">
          Non-VIP enrollment uses tier fees deducted from the transfer amount.
        </p>
        <div className="settings-grid">
          <Field
            label="Default daily yield %"
            hint="Non-VIP investors (per-user override still wins)"
          >
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={draft.investorDailyYieldPercent}
              onChange={(e) =>
                setNum("investorDailyYieldPercent", e.target.value)
              }
            />
          </Field>
          <Field
            label="Auto-reinvest fee %"
            hint="Taken from daily earning before compound (0 = full compound)"
          >
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={draft.investorAutoReinvestFeePercent}
              onChange={(e) =>
                setNum("investorAutoReinvestFeePercent", e.target.value)
              }
            />
          </Field>
        </div>
        <div className="settings-tiers">
          <div className="settings-tiers-head">
            <span>Enrollment fee tiers</span>
            <span className="muted">Fee deducted from deposit</span>
          </div>
          {draft.tiers.map((t, i) => (
            <div key={i} className="settings-tier-row">
              <input
                aria-label="Label"
                value={t.label}
                onChange={(e) => updateTier(i, { label: e.target.value })}
                placeholder="Label"
              />
              <input
                type="number"
                aria-label="Min"
                value={t.min}
                onChange={(e) => updateTier(i, { min: Number(e.target.value) })}
                placeholder="Min"
              />
              <input
                type="number"
                aria-label="Max"
                value={t.max}
                onChange={(e) => updateTier(i, { max: Number(e.target.value) })}
                placeholder="Max"
              />
              <input
                type="number"
                aria-label="Fee"
                value={t.fee}
                onChange={(e) => updateTier(i, { fee: Number(e.target.value) })}
                placeholder="Fee $"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="settings-group">
        <h3>VIP</h3>
        <p className="muted settings-group-blurb">
          VIP invest fee is a percent of the wallet transfer — deducted from the
          amount (e.g. $560 → 15% = $84 fee → $476 net).
        </p>
        <div className="settings-grid">
          <Field label="VIP daily yield %" hint="Default when VIP is active">
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={draft.investorVipDailyYieldPercent}
              onChange={(e) =>
                setNum("investorVipDailyYieldPercent", e.target.value)
              }
            />
          </Field>
          <Field
            label="VIP fee %"
            hint="% of investment / transfer amount (FEE_PROFIT)"
          >
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={draft.investorVipFeePercent}
              onChange={(e) => setNum("investorVipFeePercent", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="settings-group">
        <h3>Contract</h3>
        <p className="muted settings-group-blurb">
          On-chain contract deposit minimum and withdraw fee.
        </p>
        <div className="settings-grid">
          <Field label="Min budget (USDT)" hint="Minimum chain contract deposit">
            <input
              type="number"
              step="1"
              min={0}
              value={draft.chainContractMinUsd}
              onChange={(e) => setNum("chainContractMinUsd", e.target.value)}
            />
          </Field>
          <Field label="Chain withdraw fee %">
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={draft.chainContractWithdrawFeePercent}
              onChange={(e) =>
                setNum("chainContractWithdrawFeePercent", e.target.value)
              }
            />
          </Field>
        </div>
      </section>

      <section className="settings-group">
        <h3>Fees</h3>
        <p className="muted settings-group-blurb">
          Wallet withdrawal processing fee (VIP still pays $0 processing).
        </p>
        <div className="settings-grid">
          <Field label="Wallet withdraw fee (USDT)">
            <input
              type="number"
              step="0.01"
              min={0}
              value={draft.walletWithdrawalFeeUsdt}
              onChange={(e) =>
                setNum("walletWithdrawalFeeUsdt", e.target.value)
              }
            />
          </Field>
        </div>
      </section>

      <style>{`
        .settings-panel .settings-group {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1.1rem 1.25rem 1.25rem;
          margin-bottom: 1rem;
          background: rgba(255,255,255,0.02);
        }
        .settings-panel .settings-group h3 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .settings-group-blurb {
          margin: 0 0 1rem;
          font-size: 0.85rem;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.85rem 1rem;
        }
        .settings-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .settings-field-label {
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(255,255,255,0.75);
        }
        .settings-field-hint {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
        }
        .settings-field input {
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: inherit;
          padding: 0.55rem 0.7rem;
          font-size: 0.95rem;
        }
        .settings-tiers {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .settings-tiers-head {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
        }
        .settings-tier-row {
          display: grid;
          grid-template-columns: 1.4fr 0.7fr 0.7fr 0.7fr;
          gap: 0.4rem;
        }
        .settings-tier-row input {
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: inherit;
          padding: 0.45rem 0.55rem;
          font-size: 0.85rem;
        }
        @media (max-width: 720px) {
          .settings-tier-row {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
