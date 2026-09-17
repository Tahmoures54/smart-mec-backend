/** Client-side product analytics — fire-and-forget */

export type AnalyticsEventName =
  | 'diagnose_started'
  | 'diagnose_success'
  | 'buy_view'
  | 'buy_click'
  | 'pay_success'
  | 'garage_register'
  | 'garage_promo_click'
  | 'recovery_sms_sent';

function sessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'sm_sid';
  let id = localStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

export function getBuyAbVariant(): 'a' | 'b' {
  if (typeof window === 'undefined') return 'a';
  const key = 'sm_buy_ab';
  let v = localStorage.getItem(key);
  if (v !== 'a' && v !== 'b') {
    v = Math.random() < 0.5 ? 'a' : 'b';
    localStorage.setItem(key, v);
  }
  return v as 'a' | 'b';
}

export function track(
  event: AnalyticsEventName,
  props?: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window === 'undefined') return;
  const payload = {
    event,
    sessionId: sessionId(),
    path: window.location.pathname,
    props: props || {},
    ts: Date.now(),
  };
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics', blob);
      return;
    }
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
