export function monthlyFreeLimit(): number {
  const n = parseInt(process.env.MONTHLY_FREE_LIMIT || '2', 10);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export function referralPercentage(): number {
  const n = parseInt(process.env.REFERRAL_PERCENTAGE || '10', 10);
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

export function minWithdrawal(): number {
  const n = parseInt(process.env.MIN_WITHDRAWAL || '50000', 10);
  return Number.isFinite(n) && n > 0 ? n : 50000;
}

export const GARAGE_TIERS = ['free', 'silver', 'gold'] as const;
export type GarageTier = (typeof GARAGE_TIERS)[number];

export function normalizeGarageTier(value: unknown): GarageTier {
  const t = String(value || '').toLowerCase();
  return (GARAGE_TIERS as readonly string[]).includes(t) ? (t as GarageTier) : 'free';
}

export function garageTierRank(tier: string | null | undefined): number {
  if (tier === 'gold') return 3;
  if (tier === 'silver') return 2;
  return 1;
}
