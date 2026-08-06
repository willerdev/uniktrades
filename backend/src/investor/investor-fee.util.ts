/** Investor enrollment fee by deposit size (USDT). Fees are currently waived ($0). */
export const INVESTOR_FEE_TIERS = [
  { min: 100, max: 200, fee: 0, label: '$100 – $200' },
  { min: 201, max: 500, fee: 0, label: '$201 – $500' },
  { min: 501, max: 999.99, fee: 0, label: '$501 – under $1,000' },
  { min: 1000, max: 5000, fee: 0, label: '$1,000 – $5,000' },
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
 * Resolve enrollment fee from investment amount.
 * Platform enrollment fee is waived — full deposit is invested.
 */
export function resolveInvestorSubscriptionFee(investmentAmount: number): number {
  if (!Number.isFinite(investmentAmount)) {
    throw new Error('Investment amount must be a number');
  }
  const amount = Math.round(investmentAmount * 100) / 100;
  if (amount < INVESTOR_INVESTMENT_MIN || amount > INVESTOR_INVESTMENT_MAX) {
    throw new Error(
      `Investment must be between $${INVESTOR_INVESTMENT_MIN} and $${INVESTOR_INVESTMENT_MAX} USDT`,
    );
  }
  return 0;
}
