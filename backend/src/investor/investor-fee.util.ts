/** Investor enrollment fee by deposit size (USDT). Fee is deducted from the deposit. */
export const INVESTOR_FEE_TIERS = [
  { min: 100, max: 200, fee: 10, label: '$100 – $200' },
  { min: 201, max: 500, fee: 50, label: '$201 – $500' },
  { min: 501, max: 999.99, fee: 50, label: '$501 – under $1,000' },
  { min: 1000, max: 5000, fee: 200, label: '$1,000 – $5,000' },
] as const;

export const INVESTOR_INVESTMENT_MIN = 100;
export const INVESTOR_INVESTMENT_MAX = 5000;

export type InvestorFeeTier = {
  min: number;
  max: number;
  fee: number;
  label: string;
};

export function listInvestorFeeTiers(): InvestorFeeTier[] {
  return INVESTOR_FEE_TIERS.map((t) => ({
    min: t.min,
    max: t.max,
    fee: t.fee,
    label: t.label,
  }));
}

/**
 * Resolve enrollment fee from investment amount (non-VIP tier table).
 * Default: $100–$200 → $10 · $201–$500 → $50 · $501–under $1,000 → $50 · $1,000–$5,000 → $200
 * Fee is taken from the transfer amount (netInvested = amount − fee).
 * Pass `tiers` to use PlatformConfig overrides.
 */
export function resolveInvestorSubscriptionFee(
  investmentAmount: number,
  tiers?: InvestorFeeTier[],
): number {
  if (!Number.isFinite(investmentAmount)) {
    throw new Error('Investment amount must be a number');
  }
  const amount = Math.round(investmentAmount * 100) / 100;
  if (amount < INVESTOR_INVESTMENT_MIN || amount > INVESTOR_INVESTMENT_MAX) {
    throw new Error(
      `Investment must be between $${INVESTOR_INVESTMENT_MIN} and $${INVESTOR_INVESTMENT_MAX} USDT`,
    );
  }

  const table = tiers?.length ? tiers : listInvestorFeeTiers();
  const sorted = [...table].sort((a, b) => a.min - b.min);
  for (const tier of sorted) {
    if (amount >= tier.min && amount <= tier.max) return tier.fee;
  }
  const last = sorted[sorted.length - 1];
  if (last && amount >= last.min) return last.fee;

  // Legacy hardcoded fallback when no matching tier
  if (amount <= 200) return 10;
  if (amount <= 500) return 50;
  if (amount < 1000) return 50;
  return 200;
}
