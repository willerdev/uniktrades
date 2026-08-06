import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type EngineAllocation } from "./api";

function fmtMoney(n: number | null | undefined) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "—";
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type Props = {
  onMessage: (msg: string) => void;
};

type DraftPercents = {
  contractPercent: number;
  tradingPercent: number;
  reservePercent: number;
  profitRevenuePercent: number;
};

const BUCKET_META = [
  {
    key: "contract" as const,
    label: "Contract Budget",
    field: "contractPercent" as const,
    blurb: "Chain contracts, KYC, and onboarding capacity",
  },
  {
    key: "trading" as const,
    label: "Trading Funds",
    field: "tradingPercent" as const,
    blurb: "Live trading capital and execution float",
  },
  {
    key: "reserve" as const,
    label: "Reserve Funds",
    field: "reservePercent" as const,
    blurb: "Safety buffer and contingency cover",
  },
];

function computeLive(total: number, paidToday: number, p: DraftPercents) {
  const contractBudgetUsdt = round2((total * p.contractPercent) / 100);
  const tradingFundsUsdt = round2((total * p.tradingPercent) / 100);
  const reserveFundsUsdt = round2(total - contractBudgetUsdt - tradingFundsUsdt);
  const dailyRevenueUsdt = round2((total * p.profitRevenuePercent) / 100);
  const profitFundsUsdt = round2(Math.max(0, dailyRevenueUsdt - paidToday));
  return {
    contractBudgetUsdt,
    tradingFundsUsdt,
    reserveFundsUsdt,
    dailyRevenueUsdt,
    profitFundsUsdt,
  };
}

export function EnginePanel({ onMessage }: Props) {
  const [data, setData] = useState<EngineAllocation | null>(null);
  const [draft, setDraft] = useState<DraftPercents>({
    contractPercent: 40,
    tradingPercent: 40,
    reservePercent: 20,
    profitRevenuePercent: 10,
  });
  const [savedBaseline, setSavedBaseline] = useState<{
    profitFundsUsdt: number;
    dailyRevenueUsdt: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyServer = useCallback((res: EngineAllocation) => {
    setData(res);
    const percents = res.percents ?? {
      contractPercent: 40,
      tradingPercent: 40,
      reservePercent: 20,
      profitRevenuePercent: 10,
    };
    setDraft(percents);
    setSavedBaseline({
      profitFundsUsdt: res.profit.profitFundsUsdt,
      dailyRevenueUsdt: res.profit.dailyRevenueUsdt,
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      applyServer(await api.engine());
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to load engine");
    } finally {
      setLoading(false);
    }
  }, [applyServer, onMessage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const total = data?.totalFundsUsdt ?? 0;
  const paidToday = data?.profit.paidToUsersTodayUsdt ?? 0;

  const live = useMemo(
    () => computeLive(total, paidToday, draft),
    [total, paidToday, draft],
  );

  const capitalSum = round2(
    draft.contractPercent + draft.tradingPercent + draft.reservePercent,
  );
  const capitalOk = Math.abs(capitalSum - 100) <= 0.05;

  const dirty =
    data != null &&
    (draft.contractPercent !== data.percents?.contractPercent ||
      draft.tradingPercent !== data.percents?.tradingPercent ||
      draft.reservePercent !== data.percents?.reservePercent ||
      draft.profitRevenuePercent !== data.percents?.profitRevenuePercent);

  const profitDelta =
    savedBaseline != null
      ? round2(live.profitFundsUsdt - savedBaseline.profitFundsUsdt)
      : 0;

  function setPercent(field: keyof DraftPercents, raw: number) {
    const value = Math.min(100, Math.max(0, Number.isFinite(raw) ? raw : 0));
    setDraft((prev) => {
      if (field === "profitRevenuePercent") {
        return { ...prev, profitRevenuePercent: round2(value) };
      }
      const next = { ...prev, [field]: round2(value) };
      if (field === "contractPercent") {
        next.reservePercent = round2(
          Math.max(0, 100 - value - prev.tradingPercent),
        );
      } else if (field === "tradingPercent") {
        next.reservePercent = round2(
          Math.max(0, 100 - prev.contractPercent - value),
        );
      } else if (field === "reservePercent") {
        const remaining = round2(100 - value);
        const contractShare =
          prev.contractPercent + prev.tradingPercent > 0
            ? prev.contractPercent /
              (prev.contractPercent + prev.tradingPercent)
            : 0.5;
        next.contractPercent = round2(remaining * contractShare);
        next.tradingPercent = round2(remaining - next.contractPercent);
      }
      return next;
    });
  }

  async function save() {
    if (!capitalOk) {
      onMessage("Contract + Trading + Reserve must equal 100%");
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateEngineSettings(draft);
      applyServer(res);
      onMessage("Engine percentages saved");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function resetDraft() {
    if (!data?.percents) return;
    setDraft(data.percents);
  }

  const amounts = {
    contract: live.contractBudgetUsdt,
    trading: live.tradingFundsUsdt,
    reserve: live.reserveFundsUsdt,
  };

  return (
    <section className="engine-page">
      <header className="engine-head">
        <div>
          <p className="engine-eyebrow">Allocation</p>
          <h2 className="engine-title">Engine</h2>
          <p className="engine-desc muted">
            Adjust fund percentages in real time. Capital split must stay at
            100%. Profit uses the daily revenue rate of total funds minus paid
            to users today.
          </p>
        </div>
        <div className="engine-head-actions">
          <button
            type="button"
            className="wallet-icon-btn"
            disabled={loading}
            onClick={() => void refresh()}
            title="Refresh"
          >
            {loading ? "…" : "↻"}
          </button>
        </div>
      </header>

      <div className="engine-hero">
        <div className="engine-hero-copy">
          <p className="engine-hero-label">Total platform funds</p>
          <p className="engine-hero-balance">
            {loading && !data ? "—" : fmtMoney(total)}
          </p>
          <p className="engine-hero-sub">
            Automatic allocation engine
            {data?.asOf
              ? ` · as of ${new Date(data.asOf).toLocaleString()}`
              : ""}
          </p>
        </div>
        <div className="engine-hero-ring" aria-hidden>
          <svg viewBox="0 0 120 120" className="engine-ring-svg">
            <circle className="engine-ring-track" cx="60" cy="60" r="46" />
            <circle
              className="engine-ring-contract"
              cx="60"
              cy="60"
              r="46"
              style={{
                strokeDasharray: `${(draft.contractPercent / 100) * 289} ${289}`,
              }}
            />
            <circle
              className="engine-ring-trading"
              cx="60"
              cy="60"
              r="46"
              style={{
                strokeDasharray: `${(draft.tradingPercent / 100) * 289} ${289}`,
                strokeDashoffset: `${-(draft.contractPercent / 100) * 289}`,
              }}
            />
            <circle
              className="engine-ring-reserve"
              cx="60"
              cy="60"
              r="46"
              style={{
                strokeDasharray: `${(draft.reservePercent / 100) * 289} ${289}`,
                strokeDashoffset: `${
                  -((draft.contractPercent + draft.tradingPercent) / 100) * 289
                }`,
              }}
            />
          </svg>
          <div className="engine-ring-legend">
            <span>
              <i className="engine-dot contract" /> {draft.contractPercent}%
            </span>
            <span>
              <i className="engine-dot trading" /> {draft.tradingPercent}%
            </span>
            <span>
              <i className="engine-dot reserve" /> {draft.reservePercent}%
            </span>
          </div>
        </div>
      </div>

      <div className="engine-controls">
        <div className="engine-controls-head">
          <h3>Live percentages</h3>
          <span
            className={`engine-sum-pill${capitalOk ? " ok" : " bad"}`}
          >
            Capital sum {capitalSum}%
            {capitalOk ? " · valid" : " · must be 100%"}
          </span>
        </div>
        <div className="engine-sliders">
          {BUCKET_META.map((b) => (
            <label key={b.key} className={`engine-slider engine-slider-${b.key}`}>
              <div className="engine-slider-top">
                <span>{b.label}</span>
                <strong>{draft[b.field]}%</strong>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={draft[b.field]}
                onChange={(e) => setPercent(b.field, Number(e.target.value))}
              />
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={draft[b.field]}
                onChange={(e) => setPercent(b.field, Number(e.target.value))}
              />
            </label>
          ))}
          <label className="engine-slider engine-slider-profit">
            <div className="engine-slider-top">
              <span>Daily revenue rate (Profit)</span>
              <strong>{draft.profitRevenuePercent}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={draft.profitRevenuePercent}
              onChange={(e) =>
                setPercent("profitRevenuePercent", Number(e.target.value))
              }
            />
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={draft.profitRevenuePercent}
              onChange={(e) =>
                setPercent("profitRevenuePercent", Number(e.target.value))
              }
            />
          </label>
        </div>
        <div className="engine-controls-actions">
          <button
            type="button"
            className="secondary"
            disabled={!dirty || saving}
            onClick={resetDraft}
          >
            Reset
          </button>
          <button
            type="button"
            className="primary"
            disabled={!dirty || !capitalOk || saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save percentages"}
          </button>
        </div>
      </div>

      <div className="engine-flow" aria-label="Capital split flow">
        <div className="engine-source">
          <span className="engine-source-pulse" />
          <strong>Total funds</strong>
          <em>{fmtMoney(total)}</em>
        </div>

        <div className="engine-pipes" aria-hidden>
          <svg viewBox="0 0 100 80" preserveAspectRatio="none">
            <path className="engine-pipe contract" d="M0 40 C 35 40, 35 12, 100 12" />
            <path className="engine-pipe trading" d="M0 40 C 35 40, 35 40, 100 40" />
            <path className="engine-pipe reserve" d="M0 40 C 35 40, 35 68, 100 68" />
          </svg>
        </div>

        <div className="engine-tanks">
          {BUCKET_META.map((b) => (
            <article key={b.key} className={`engine-tank engine-tank-${b.key}`}>
              <div className="engine-tank-head">
                <span className="engine-pct">{draft[b.field]}%</span>
                <h3>{b.label}</h3>
              </div>
              <div className="engine-tank-body">
                <div
                  className="engine-tank-fill"
                  style={{
                    height: `${Math.min(
                      100,
                      Math.max(8, draft[b.field] * 1.6),
                    )}%`,
                  }}
                />
                <p className="engine-tank-amount">{fmtMoney(amounts[b.key])}</p>
              </div>
              <p className="engine-tank-blurb muted">{b.blurb}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="engine-profit">
        <div className="engine-profit-head">
          <p className="engine-eyebrow">Daily</p>
          <h3>Profit Funds</h3>
          <p className="muted">
            {draft.profitRevenuePercent}% of total funds − amount paid to users
            today
          </p>
        </div>

        <div className="engine-profit-formula">
          <div className="engine-profit-term">
            <span>{draft.profitRevenuePercent}% of total</span>
            <strong>{fmtMoney(live.dailyRevenueUsdt)}</strong>
          </div>
          <span className="engine-profit-op" aria-hidden>
            −
          </span>
          <div className="engine-profit-term">
            <span>Paid to users today</span>
            <strong>{fmtMoney(paidToday)}</strong>
          </div>
          <span className="engine-profit-op" aria-hidden>
            =
          </span>
          <div className="engine-profit-result">
            <span>Profit Funds</span>
            <strong>{fmtMoney(live.profitFundsUsdt)}</strong>
          </div>
        </div>

        <div
          className={`engine-profit-impact${
            profitDelta > 0 ? " up" : profitDelta < 0 ? " down" : ""
          }`}
        >
          <span>Profit vs saved settings</span>
          <strong>
            {profitDelta > 0 ? "+" : ""}
            {fmtMoney(profitDelta)}
            {savedBaseline != null && (
              <em className="muted">
                {" "}
                (was {fmtMoney(savedBaseline.profitFundsUsdt)})
              </em>
            )}
          </strong>
        </div>

        <div className="engine-profit-gauge" aria-hidden>
          <div
            className="engine-profit-gauge-fill"
            style={{
              width: `${
                live.dailyRevenueUsdt > 0
                  ? Math.min(
                      100,
                      (live.profitFundsUsdt / live.dailyRevenueUsdt) * 100,
                    )
                  : 0
              }%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
