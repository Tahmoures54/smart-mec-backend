const protectedPrefixes = [
  '/api/diagnose',
  '/api/v1/diagnose',
  '/api/purchase',
  '/api/v1/purchase',
  '/api/account/credits',
  '/api/v1/account/credits',
  '/api/account/withdraw',
  '/api/v1/account/withdraw',
  '/api/admin',
  '/api/v1/admin',
  '/api/feedback',
  '/api/v1/feedback',
];

const publicExactOrPrefix = [
  '/api/purchase/verify',
  '/api/v1/purchase/verify',
];

export function normalizeApiPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isProtectedApiPath(pathname: string): boolean {
  const path = normalizeApiPath(pathname);
  const isPublicCallback = publicExactOrPrefix.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
  if (isPublicCallback) return false;
  return protectedPrefixes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}
