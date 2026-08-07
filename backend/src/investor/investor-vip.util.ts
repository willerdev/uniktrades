/** @deprecated Flat VIP subscription fee removed — VIP fee is % of investment. */
export const INVESTOR_VIP_FEE_USDT = 0;
/** Default VIP fee as percent of the wallet transfer / investment amount. */
export const INVESTOR_VIP_FEE_PERCENT = 15;
export const INVESTOR_VIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const INVESTOR_VIP_REMINDER_DAYS = 3;
/** Default daily investment yield for active VIP (when no per-user override). */
export const INVESTOR_VIP_DAILY_YIELD_PERCENT = 8;

/** VIP AI may approve wallet withdrawals only after this pending age. */
export const VIP_AI_WITHDRAW_MIN_AGE_MS = 30 * 60 * 1000;

export function isInvestorVipActive(user: {
  investorVipActive?: boolean | null;
  investorVipExpiresAt?: Date | string | null;
}): boolean {
  if (!user.investorVipActive || !user.investorVipExpiresAt) return false;
  const expires =
    user.investorVipExpiresAt instanceof Date
      ? user.investorVipExpiresAt
      : new Date(user.investorVipExpiresAt);
  return Number.isFinite(expires.getTime()) && expires.getTime() > Date.now();
}

/**
 * Per-user admin override wins; otherwise VIP gets elevated default yield,
 * else platform default.
 */
export function resolveInvestorDailyYieldPercent(opts: {
  vipActive: boolean;
  settingsYieldPercent?: number | null;
  platformYieldPercent: number;
  /** Runtime VIP default from PlatformConfig (falls back to constant). */
  vipYieldPercent?: number;
}): number {
  if (
    opts.settingsYieldPercent != null &&
    Number.isFinite(Number(opts.settingsYieldPercent))
  ) {
    return Number(opts.settingsYieldPercent);
  }
  if (opts.vipActive) {
    const vipDefault = opts.vipYieldPercent;
    return Number.isFinite(Number(vipDefault))
      ? Number(vipDefault)
      : INVESTOR_VIP_DAILY_YIELD_PERCENT;
  }
  return opts.platformYieldPercent;
}

/** Extend from max(now, currentExpiry) by one VIP period. */
export function nextVipExpiry(currentExpiresAt?: Date | null): Date {
  const now = Date.now();
  const base =
    currentExpiresAt && currentExpiresAt.getTime() > now
      ? currentExpiresAt.getTime()
      : now;
  return new Date(base + INVESTOR_VIP_DURATION_MS);
}
