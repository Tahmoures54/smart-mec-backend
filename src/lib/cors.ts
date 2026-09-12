const DEFAULT_ORIGINS = [
  'https://smart-mec.ir',
  'https://www.smart-mec.ir',
  'https://smart-mec-backend-zeta.vercel.app',
  'http://localhost:3000',
];

export function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_ORIGINS;
}

export function matchOrigin(
  requestOrigin: string | null | undefined,
  allowed: string[] = getAllowedOrigins(),
  options?: { allowLocalhost?: boolean }
): string | null {
  if (!requestOrigin) {
    return allowed[0] ?? null;
  }

  if (allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  const allowLocalhost =
    options?.allowLocalhost ?? process.env.NODE_ENV !== 'production';
  if (allowLocalhost && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

export function buildCorsHeaders(
  request: Pick<Request, 'headers'>,
  extra?: HeadersInit
): Headers {
  const headers = new Headers(extra);
  const allowed = matchOrigin(request.headers.get('origin'));
  if (allowed) {
    headers.set('Access-Control-Allow-Origin', allowed);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept, Accept-Version, X-Requested-With, X-Api-Version, X-CSRF-Token'
  );
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

export function applyCorsHeaders(
  request: Pick<Request, 'headers'>,
  response: { headers: Headers }
): void {
  const cors = buildCorsHeaders(request);
  cors.forEach((value, key) => {
    response.headers.set(key, value);
  });
}
