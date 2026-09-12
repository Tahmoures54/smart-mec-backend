export function isMockAuthority(code: string | null | undefined): boolean {
  return typeof code === 'string' && code.startsWith('MOCK_');
}

export function computeGoldenExpiry(
  currentExpiry: string | Date | null | undefined,
  goldenDays: number,
  nowMs: number = Date.now()
): string {
  const days = Number(goldenDays);
  if (!Number.isFinite(days) || days <= 0) {
    return new Date(nowMs).toISOString();
  }

  let base = nowMs;
  if (currentExpiry) {
    const parsed = new Date(currentExpiry).getTime();
    if (Number.isFinite(parsed) && parsed > nowMs) {
      base = parsed;
    }
  }

  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

export function computeReferralCommission(
  amount: number,
  percentage: number
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(percentage) || percentage <= 0) return 0;
  return Math.floor((amount * percentage) / 100);
}
