const TOKEN_KEY = 'smartmec_web_token';

export function getTokenKey() {
  return TOKEN_KEY;
}

/** Valid token from localStorage, or null if missing/too short */
export function readWebToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem(TOKEN_KEY)?.trim() ?? '';
  return t.length > 10 ? t : null;
}

export function clearWebToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function saveWebToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
