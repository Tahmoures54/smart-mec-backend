'use client';

import { useCallback, useEffect, useState } from 'react';

const API = typeof window !== 'undefined' ? window.location.origin : '';

type Tab = 'dashboard' | 'users' | 'withdrawals' | 'purchases';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('09160684552');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dash, setDash] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [wStatus, setWStatus] = useState('pending');

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    if (t) setToken(t);
  }, []);

  const headers = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  async function sendOtp() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا');
      setOtpSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phone, code: otp }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا');
      if (data.user?.phone !== '09160684552' && data.user?.phone !== phone) {
        // سرور با requireAdmin چک می‌کند؛ اینجا فقط هشدار
      }
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('admin_token');
    setToken('');
    setDash(null);
  }

  async function load(section: Tab) {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      let url = `${API}/api/admin?section=${section === 'dashboard' ? 'dashboard' : section}`;
      if (section === 'users' && search) url += `&q=${encodeURIComponent(search)}`;
      if (section === 'withdrawals') url += `&status=${wStatus}`;

      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا');

      if (section === 'dashboard') setDash(data.data);
      if (section === 'users') setUsers(data.data);
      if (section === 'withdrawals') setWithdrawals(data.data);
      if (section === 'purchases') setPurchases(data.data);
    } catch (e: any) {
      setError(e.message);
      if (String(e.message).includes('ادمین') || String(e.message).includes('401')) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab, wStatus]);

  async function resolveWithdrawal(id: number, status: 'paid' | 'rejected') {
    const note =
      status === 'rejected'
        ? prompt('دلیل رد (اختیاری):') || ''
        : prompt('یادداشت (مثلاً شماره پیگیری کارت به کارت):') || '';
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          action: 'resolve_withdrawal',
          withdrawalId: id,
          status,
          adminNote: note,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا');
      await load('withdrawals');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function adjustUser(userId: number) {
    const credits = prompt('اعتبار جدید (خالی = بدون تغییر):');
    const golden = prompt('طلایی؟ (1=بله 0=خیر خالی=بدون تغییر):');
    const body: any = { action: 'adjust_user', userId };
    if (credits !== null && credits !== '') body.credits = parseInt(credits, 10);
    if (golden === '1') {
      body.isGolden = true;
      body.goldenDays = parseInt(prompt('چند روز طلایی؟') || '30', 10);
    }
    if (golden === '0') body.isGolden = false;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا');
      await load('users');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) => (n || 0).toLocaleString('fa-IR');

  if (!token) {
    return (
      <div style={styles.page} dir="rtl">
        <div style={styles.card}>
          <h1 style={{ color: '#ff9800', marginBottom: 8 }}>پنل ادمین</h1>
          <p style={{ color: '#888', marginBottom: 24 }}>مکانیک هوشمند</p>
          {error && <p style={styles.err}>{error}</p>}
          {!otpSent ? (
            <>
              <input
                style={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="شماره ادمین"
              />
              <button style={styles.btn} disabled={loading} onClick={sendOtp}>
                ارسال کد
              </button>
            </>
          ) : (
            <>
              <input
                style={styles.input}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="کد تأیید / بای‌پس ادمین"
              />
              <button style={styles.btn} disabled={loading} onClick={login}>
                ورود
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page} dir="rtl">
      <div style={{ maxWidth: 1100, width: '100%' }}>
        <div style={styles.topBar}>
          <h1 style={{ color: '#ff9800', margin: 0, fontSize: 22 }}>پنل ادمین</h1>
          <button style={styles.btnGhost} onClick={logout}>
            خروج
          </button>
        </div>

        <div style={styles.tabs}>
          {(
            [
              ['dashboard', 'داشبورد'],
              ['users', 'کاربران / رفرال'],
              ['withdrawals', 'برداشت‌ها'],
              ['purchases', 'خریدها'],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              style={tab === k ? styles.tabActive : styles.tab}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p style={styles.err}>{error}</p>}
        {loading && <p style={{ color: '#888' }}>در حال بارگذاری...</p>}

        {tab === 'dashboard' && dash && (
          <div style={styles.grid}>
            <Stat title="کاربران" value={fmt(dash.users)} />
            <Stat title="درآمد کل" value={`${fmt(dash.revenue)} ت`} />
            <Stat title="عیب‌یابی‌ها" value={fmt(dash.diagnostics)} />
            <Stat title="برداشت در انتظار" value={fmt(dash.pendingWithdrawals)} />
            <Stat
              title="موجودی رفرال کاربران"
              value={`${fmt(dash.totalReferralEarnings)} ت`}
            />
            <Stat title="تعداد خرید" value={fmt(dash.purchases)} />
          </div>
        )}

        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                placeholder="جستجو شماره یا کد معرف"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button style={styles.btn} onClick={() => load('users')}>
                جستجو
              </button>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>موبایل</th>
                    <th>اعتبار</th>
                    <th>طلایی</th>
                    <th>کد معرف</th>
                    <th>دعوت‌ها</th>
                    <th>درآمد</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.phone}</td>
                      <td>{u.credits}</td>
                      <td>{u.isGolden ? '✓' : '—'}</td>
                      <td>{u.referralCode || '—'}</td>
                      <td>{u.referredCount}</td>
                      <td>{fmt(u.earnings)}</td>
                      <td>
                        <button
                          style={styles.btnSmall}
                          onClick={() => adjustUser(u.id)}
                        >
                          ویرایش
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'withdrawals' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <select
                style={styles.input}
                value={wStatus}
                onChange={(e) => setWStatus(e.target.value)}
              >
                <option value="pending">در انتظار</option>
                <option value="paid">پرداخت‌شده</option>
                <option value="rejected">رد شده</option>
                <option value="all">همه</option>
              </select>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>موبایل</th>
                    <th>مبلغ</th>
                    <th>کارت/شبا</th>
                    <th>نام</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td>{w.id}</td>
                      <td>{w.phone}</td>
                      <td>{fmt(w.amount)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {w.cardNumber}
                      </td>
                      <td>{w.fullName}</td>
                      <td>{w.status}</td>
                      <td>
                        {w.status === 'pending' && (
                          <>
                            <button
                              style={{ ...styles.btnSmall, background: '#4caf50' }}
                              onClick={() => resolveWithdrawal(w.id, 'paid')}
                            >
                              پرداخت شد
                            </button>{' '}
                            <button
                              style={{ ...styles.btnSmall, background: '#f44336' }}
                              onClick={() => resolveWithdrawal(w.id, 'rejected')}
                            >
                              رد
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'purchases' && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>موبایل</th>
                  <th>محصول</th>
                  <th>مبلغ</th>
                  <th>وضعیت</th>
                  <th>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.phone}</td>
                    <td>{p.productId}</td>
                    <td>{fmt(p.amount)}</td>
                    <td>{p.status}</td>
                    <td style={{ fontSize: 12 }}>{p.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.stat}>
      <div style={{ color: '#888', fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0d0d12',
    color: '#fff',
    padding: 24,
    fontFamily: 'Tahoma, Arial, sans-serif',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    background: '#1a1a22',
    padding: 32,
    borderRadius: 16,
    width: 360,
    border: '1px solid #333',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #333',
    background: '#121218',
    color: '#fff',
    marginBottom: 12,
    boxSizing: 'border-box',
    fontSize: 15,
  },
  btn: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: 'none',
    background: '#ff9800',
    color: '#000',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 15,
  },
  btnGhost: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #444',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
  },
  btnSmall: {
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    background: '#ff9800',
    color: '#000',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 12,
  },
  err: { color: '#f44336', marginBottom: 12 },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #333',
    background: '#1a1a22',
    color: '#aaa',
    cursor: 'pointer',
  },
  tabActive: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #ff9800',
    background: '#2a1f0a',
    color: '#ff9800',
    cursor: 'pointer',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  stat: {
    background: '#1a1a22',
    border: '1px solid #333',
    borderRadius: 12,
    padding: 16,
  },
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid #333' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
};

// fix table header styles via global-ish approach in cells
if (typeof document !== 'undefined') {
  // no-op; inline styles on th/td via cascade limited — acceptable for admin tool
}
