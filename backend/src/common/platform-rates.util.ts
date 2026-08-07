import {
  INVESTOR_FEE_TIERS,
  INVESTOR_INVESTMENT_MAX,
  INVESTOR_INVESTMENT_MIN,
  type InvestorFeeTier,
  listInvestorFeeTiers,
} from '../investor/investor-fee.util';
import { INVESTOR_VIP_DAILY_YIELD_PERCENT } from '../investor/investor-vip.util';
import { INVESTOR_AUTO_REINVEST_FEE_PERCENT } from './constants';

/** Defaults when PlatformConfig row / column is missing. */
export const PLATFORM_RATE_DEFAULTS = {
  investorDailyYieldPercent: 5,
  investorVipDailyYieldPercent: INVESTOR_VIP_DAILY_YIELD_PERCENT,
  investorVipFeePercent: 15,
  investorAutoReinvestFeePercent: INVESTOR_AUTO_REINVEST_FEE_PERCENT,
  chainContractMinUsd: 2000,
  chainContractWithdrawFeePercent: 0,
  walletWithdrawalFeeUsdt: 3,
} as const;

export type PlatformRates = {
  investorDailyYieldPercent: number;
  investorVipDailyYieldPercent: number;
  investorVipFeePercent: number;
  investorAutoReinvestFeePercent: number;
  chainContractMinUsd: number;
  chainContractWithdrawFeePercent: number;
  walletWithdrawalFeeUsdt: number;
  investorFeeTiers: InvestorFeeTier[];
  investmentMin: number;
  investmentMax: number;
};

export type PlatformConfigRateFields = {
  investorDailyYieldPercent?: unknown;
  investorVipDailyYieldPercent?: unknown;
  investorVipFeePercent?: unknown;
  investorAutoReinvestFeePercent?: unknown;
  chainContractMinUsd?: unknown;
  chainContractWithdrawFeePercent?: unknown;
  walletWithdrawalFeeUsdt?: unknown;
  investorFeeTiersJson?: string | null;
};

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseInvestorFeeTiersJson(
  raw: string | null | undefined,
): InvestorFeeTier[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const tiers: InvestorFeeTier[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const min = Number(r.min);
      const max = Number(r.max);
      const fee = Number(r.fee);
      const label = String(r.label ?? '').trim();
      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        !Number.isFinite(fee) ||
        fee < 0 ||
        max < min
      ) {
        return null;
      }
      tiers.push({
        min,
        max,
        fee,
        label: label || `$${min} – $${max}`,
      });
    }
    return tiers;
  } catch {
    return null;
  }
}

export function resolveInvestorFeeFromTiers(
  investmentAmount: number,
  tiers: InvestorFeeTier[],
): number {
  const amount = Math.round(investmentAmount * 100) / 100;
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  for (const tier of sorted) {
    if (amount >= tier.min && amount <= tier.max) return tier.fee;
  }
  // Fallback: nearest tier by min, or last tier fee
  const last = sorted[sorted.length - 1];
  if (last && amount >= last.min) return last.fee;
  throw new Error('Investment amount is outside a fee tier');
}

/** VIP fee = percent of total investment / wallet transfer amount. */
export function resolveVipInvestFee(
  investmentAmount: number,
  vipFeePercent: number,
): number {
  const amount = Math.round(Number(investmentAmount) * 100) / 100;
  const pct = Number(vipFeePercent);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Investment amount must be a positive number');
  }
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw new Error('VIP fee percent must be 0–100');
  }
  return Math.round(((amount * pct) / 100) * 100) / 100;
}

export function platformRatesFromConfig(
  config: PlatformConfigRateFields | null | undefined,
): PlatformRates {
  const tiers =
    parseInvestorFeeTiersJson(config?.investorFeeTiersJson) ??
    listInvestorFeeTiers();
  return {
    investorDailyYieldPercent: num(
      config?.investorDailyYieldPercent,
      PLATFORM_RATE_DEFAULTS.investorDailyYieldPercent,
    ),
    investorVipDailyYieldPercent: num(
      config?.investorVipDailyYieldPercent,
      PLATFORM_RATE_DEFAULTS.investorVipDailyYieldPercent,
    ),
    investorVipFeePercent: num(
      config?.investorVipFeePercent,
      PLATFORM_RATE_DEFAULTS.investorVipFeePercent,
    ),
    investorAutoReinvestFeePercent: num(
      config?.investorAutoReinvestFeePercent,
      PLATFORM_RATE_DEFAULTS.investorAutoReinvestFeePercent,
    ),
    chainContractMinUsd: num(
      config?.chainContractMinUsd,
      PLATFORM_RATE_DEFAULTS.chainContractMinUsd,
    ),
    chainContractWithdrawFeePercent: num(
      config?.chainContractWithdrawFeePercent,
      PLATFORM_RATE_DEFAULTS.chainContractWithdrawFeePercent,
    ),
    walletWithdrawalFeeUsdt: num(
      config?.walletWithdrawalFeeUsdt,
      PLATFORM_RATE_DEFAULTS.walletWithdrawalFeeUsdt,
    ),
    investorFeeTiers: tiers,
    investmentMin: INVESTOR_INVESTMENT_MIN,
    investmentMax: INVESTOR_INVESTMENT_MAX,
  };
}

export function serializeInvestorFeeTiers(
  tiers: InvestorFeeTier[],
): string {
  return JSON.stringify(
    tiers.map((t) => ({
      min: t.min,
      max: t.max,
      fee: t.fee,
      label: t.label,
    })),
  );
}

export function defaultInvestorFeeTiersJson(): string {
  return serializeInvestorFeeTiers(
    INVESTOR_FEE_TIERS.map((t) => ({
      min: t.min,
      max: t.max,
      fee: t.fee,
      label: t.label,
    })),
  );
}
