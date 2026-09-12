export function isGoldenActive(
  user: { isGolden?: boolean | null; goldenExpiresAt?: string | Date | null },
  now: Date = new Date()
): boolean {
  if (!user.isGolden || !user.goldenExpiresAt) return false;
  const expires = new Date(user.goldenExpiresAt);
  return Number.isFinite(expires.getTime()) && expires > now;
}
