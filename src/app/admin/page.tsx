'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';

const API = typeof window !== 'undefined' ? window.location.origin : '';

type Tab = 'dashboard' | 'users' | 'withdrawals' | 'purchases' | 'garages' | 'diagnostics';

export default function AdminPage() {
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('admin_token') || '';
  });
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
  const [garages, setGarages] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [wStatus, setWStatus] = useState('pending');
  const [garageForm, setGarageForm] = useState<any | null>(null);
  const [gSearch, setGSearch] = useState('');

  const headers = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  );

  useEffect(() => {
    if (!token) return;
    const handle = window.setTimeout(() => {
      void load(tab);
    }, 0);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab, wStatus]);

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
      if (!data.success) throw new Error(data.error || 'خطا در ارسال کد');
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
      if (!data.success) throw new Error(data.error || 'خطا در ورود');
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
      let url = `${API}/api/admin?section=${section}`;
      if (section === 'users' && search) url += `&q=${encodeURIComponent(search)}`;
      if (section === 'withdrawals') url += `&status=${wStatus}`;
      if (section === 'garages' && gSearch) url += `&q=${encodeURIComponent(gSearch)}`;
      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا');
      if (section === 'dashboard') setDash(data.data);
      if (section === 'users') setUsers(data.data);
      if (section === 'withdrawals') setWithdrawals(data.data);
      if (section === 'purchases') setPurchases(data.data);
      if (section === 'garages') setGarages(data.data);
      if (section === 'diagnostics') setDiagnostics(data.data);
    } catch (e: any) {
      setError(e.message);
      if (String(e.message).includes('ادمین') || String(e.message).includes('401') || String(e.message).includes('توکن')) logout();
    } finally {
      setLoading(false);
    }
  }

  async function resolveWithdrawal(id: number, status: 'paid' | 'rejected') {
    const note = status === 'rejected' ? prompt('دلیل رد:') || '' : prompt('یادداشت:') || '';
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'resolve_withdrawal', withdrawalId: id, status, adminNote: note }),
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
    const golden = prompt('طلایی؟ (1=بله 0=خیر):');
    const body: any = { action: 'adjust_user', userId };
    if (credits !== null && credits !== '') body.credits = parseInt(credits, 10);
    if (golden === '1') {
      body.isGolden = true;
      body.goldenDays = parseInt(prompt('چند روز؟') || '30', 10);
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

  function emptyGarageForm() {
    return {
      id: null,
      name: '',
      address: '',
      phone: '',
      lat: '',
      lng: '',
      rating: '',
      reviewsCount: '',
      specialties: '',
      photoUrl: '',
      website: '',
      description: '',
      city: 'تهران',
      isOpen: true,
      isFeatured: false,
      isVerified: false,
      isActive: true,
      subscriptionTier: 'free',
      subscriptionExpiresAt: '',
    };
  }

  async function saveGarage() {
    if (!garageForm) return;
    setLoading(true);
    setError('');
    try {
      const action = garageForm.id ? 'update_garage' : 'create_garage';
      const res = await fetch(`${API}/api/admin`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action, ...garageForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا در ذخیره');
      setGarageForm(null);
      await load('garages');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleGarage(id: number, field: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'toggle_garage', id, field }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا');
      await load('garages');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteGarage(id: number) {
    if (!confirm('این تعمیرگاه غیرفعال شود؟')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'delete_garage', id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'خطا');
      await load('garages');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) => (n || 0).toLocaleString('fa-IR');

  if (!token) {
    return (
      <div style={s.shell} dir="rtl">
        <div style={s.loginCard}>
          <div style={s.loginBadge}>ADMIN</div>
          <div style={s.logoCircle}>🔧</div>
          <h1 style={s.loginTitle}>پنل مدیریت</h1>
          <p style={s.loginSub}>مکانیک هوشمند</p>
          {error && <div style={s.alertError}>{error}</div>}
          {!otpSent ? (
            <>
              <label style={s.label}>شماره موبایل ادمین</label>
              <input style={s.input} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
              <button style={s.btnPrimary} disabled={loading} onClick={sendOtp}>{loading ? '...' : 'ارسال کد'}</button>
            </>
          ) : (
            <>
              <label style={s.label}>کد تأیید</label>
              <input style={{ ...s.input, textAlign: 'center', letterSpacing: 6 }} value={otp} onChange={(e) => setOtp(e.target.value)} dir="ltr" />
              <button style={s.btnPrimary} disabled={loading} onClick={login}>{loading ? '...' : 'ورود'}</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'داشبورد', icon: '📊' },
    { key: 'users', label: 'کاربران', icon: '👥' },
    { key: 'garages', label: 'تعمیرگاه‌ها', icon: '🔧' },
    { key: 'diagnostics', label: 'عیب‌یابی‌ها', icon: '🧠' },
    { key: 'withdrawals', label: 'برداشت‌ها', icon: '💳' },
    { key: 'purchases', label: 'خریدها', icon: '🧾' },
  ];

  return (
    <div style={s.shell} dir="rtl">
      <div style={s.layout}>
        <aside style={s.sidebar}>
          <div style={s.sideBrand}>
            <span style={{ fontSize: 28 }}>🔧</span>
            <div>
              <div style={{ fontWeight: 800, color: '#ff9800' }}>Smart MEC</div>
              <div style={{ fontSize: 11, color: '#888' }}>Admin</div>
            </div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {tabs.map((t) => (
              <button key={t.key} style={tab === t.key ? s.navActive : s.navItem} onClick={() => setTab(t.key)}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </nav>
          <button style={s.logoutBtn} onClick={logout}>خروج</button>
        </aside>
        <main style={s.main}>
          <header style={s.header}>
            <div>
              <h2 style={s.pageTitle}>{tabs.find((t) => t.key === tab)?.label}</h2>
              <p style={s.pageSub}>مدیریت مکانیک هوشمند</p>
            </div>
            {loading && <div style={s.spinner} />}
          </header>
          {error && <div style={s.alertError}>{error}</div>}

          {tab === 'dashboard' && dash && (
            <div style={s.statGrid}>
              <StatCard icon="👥" title="کاربران" value={fmt(dash.users)} accent="#42a5f5" />
              <StatCard icon="💰" title="درآمد" value={`${fmt(dash.revenue)} ت`} accent="#66bb6a" />
              <StatCard icon="🧠" title="عیب‌یابی" value={fmt(dash.diagnostics)} accent="#ab47bc" />
              <StatCard icon="⏳" title="برداشت معلق" value={fmt(dash.pendingWithdrawals)} accent="#ff9800" />
              <StatCard icon="🔧" title="تعمیرگاه‌ها" value={fmt(dash.garages || 0)} accent="#ffa726" />
              <StatCard icon="⭐" title="ویژه / فعال" value={`${fmt(dash.garagesFeatured || 0)} / ${fmt(dash.garagesActive || 0)}`} accent="#ffca28" />
              <StatCard icon="🎁" title="درآمد رفرال" value={`${fmt(dash.totalReferralEarnings || 0)} ت`} accent="#26c6da" />
              <StatCard icon="⭐" title="بازخورد" value={fmt(dash.feedback || 0)} accent="#ef5350" />
            </div>
          )}

          {tab === 'garages' && (
            <>
              <div style={s.toolbar}>
                <input style={{ ...s.input, marginBottom: 0, flex: 1, maxWidth: 280 }} placeholder="جستجو..." value={gSearch} onChange={(e) => setGSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load('garages')} />
                <button style={s.btnPrimarySm} onClick={() => load('garages')}>جستجو</button>
                <button style={s.btnPrimarySm} onClick={() => setGarageForm(emptyGarageForm())}>+ جدید</button>
              </div>
              {garageForm && (
                <div style={{ ...s.tableCard, marginBottom: 16, border: '1px solid rgba(255,152,0,0.35)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 12 }}>{garageForm.id ? `ویرایش #${garageForm.id}` : 'افزودن تعمیرگاه'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {(['name','phone','city','address','lat','lng','rating','reviewsCount','specialties','photoUrl','website','subscriptionTier','subscriptionExpiresAt'] as string[]).map((key) => (
                      <label key={key} style={{ fontSize: 12, color: '#aaa' }}>
                        {key === 'subscriptionTier' ? 'سطح اشتراک (free/silver/gold)' : key === 'subscriptionExpiresAt' ? 'انقضای اشتراک' : key}
                        <input style={{ ...s.input, marginTop: 4, marginBottom: 0 }} value={garageForm[key] ?? ''} onChange={(e) => setGarageForm({ ...garageForm, [key]: e.target.value })} />
                      </label>
                    ))}
                    <label style={{ fontSize: 12, color: '#aaa', gridColumn: '1 / -1' }}>
                      توضیحات
                      <textarea style={{ ...s.input, marginTop: 4, minHeight: 60 }} value={garageForm.description ?? ''} onChange={(e) => setGarageForm({ ...garageForm, description: e.target.value })} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    {([['isFeatured','ویژه'],['isVerified','تأیید'],['isOpen','باز'],['isActive','فعال']] as [string,string][]).map(([k,l]) => (
                      <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                        <input type="checkbox" checked={Boolean(garageForm[k])} onChange={(e) => setGarageForm({ ...garageForm, [k]: e.target.checked })} />
                        {l}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button style={s.btnPrimarySm} onClick={saveGarage}>ذخیره</button>
                    <button style={s.btnGhost} onClick={() => setGarageForm(null)}>انصراف</button>
                  </div>
                </div>
              )}
              <div style={s.tableCard}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>#</th><th style={s.th}>نام</th><th style={s.th}>شهر</th><th style={s.th}>تلفن</th><th style={s.th}>سطح</th><th style={s.th}>وضعیت</th><th style={s.th}>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {garages.length === 0 && <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#777' }}>خالی</td></tr>}
                    {garages.map((g) => (
                      <tr key={g.id} style={{ opacity: g.isActive ? 1 : 0.45 }}>
                        <td style={s.td}>{g.id}</td>
                        <td style={s.td}><div style={{ fontWeight: 700 }}>{g.name}</div><div style={{ fontSize: 11, color: '#888' }}>{g.specialties || '—'}</div></td>
                        <td style={s.td}>{g.city || '—'}</td>
                        <td style={s.td}>{g.phone || '—'}</td>
                        <td style={s.td}>
                          {g.subscriptionTier === 'gold' && <span style={badgeGold}>طلایی</span>}
                          {g.subscriptionTier === 'silver' && <span style={badgeMuted}>نقره‌ای</span>}
                          {(!g.subscriptionTier || g.subscriptionTier === 'free') && <span style={badgeMuted}>رایگان</span>}
                        </td>
                        <td style={s.td}>
                          {g.isFeatured && <span style={badgeGold}>ویژه</span>}{' '}
                          {g.isVerified && <span style={badgeOk}>تأیید</span>}
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={s.btnGhost} onClick={() => setGarageForm({ ...emptyGarageForm(), ...g, lat: String(g.lat ?? ''), lng: String(g.lng ?? ''), rating: g.rating != null ? String(g.rating) : '', reviewsCount: g.reviewsCount != null ? String(g.reviewsCount) : '', subscriptionTier: g.subscriptionTier || 'free' })}>ویرایش</button>
                            <button style={s.btnGhost} onClick={() => toggleGarage(g.id, 'isFeatured')}>⭐</button>
                            <button style={s.btnGhost} onClick={() => toggleGarage(g.id, 'isVerified')}>✓</button>
                            <button style={s.btnGhost} onClick={() => toggleGarage(g.id, 'isActive')}>⏻</button>
                            <button style={{ ...s.btnGhost, color: '#e57373' }} onClick={() => deleteGarage(g.id)}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'users' && (
            <>
              <div style={s.toolbar}>
                <input style={{ ...s.input, marginBottom: 0, flex: 1, maxWidth: 280 }} placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load('users')} />
                <button style={s.btnPrimarySm} onClick={() => load('users')}>جستجو</button>
              </div>
              <div style={s.tableCard}>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>ID</th><th style={s.th}>موبایل</th><th style={s.th}>اعتبار</th><th style={s.th}>درآمد</th><th style={s.th}>رفرال</th><th style={s.th}>وضعیت</th><th style={s.th}></th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td style={s.td}>{u.id}</td>
                        <td style={{ ...s.td, direction: 'ltr' }}>{u.phone}</td>
                        <td style={s.td}>{u.credits}</td>
                        <td style={s.td}>{fmt(u.earnings || 0)}</td>
                        <td style={s.td}>{u.referralCode || '—'}</td>
                        <td style={s.td}>{u.isGolden ? <span style={badgeGold}>طلایی</span> : <span style={badgeMuted}>عادی</span>}</td>
                        <td style={s.td}><button style={s.btnGhostSm} onClick={() => adjustUser(u.id)}>ویرایش</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'withdrawals' && (
            <>
              <div style={s.toolbar}>
                {['pending', 'paid', 'rejected', 'all'].map((st) => (
                  <button key={st} style={wStatus === st ? s.chipActive : s.chip} onClick={() => setWStatus(st)}>
                    {st === 'pending' ? 'در انتظار' : st === 'paid' ? 'پرداخت' : st === 'rejected' ? 'رد' : 'همه'}
                  </button>
                ))}
              </div>
              <div style={s.tableCard}>
                <table style={s.table}>
                  <thead><tr><th style={s.th}>ID</th><th style={s.th}>موبایل</th><th style={s.th}>مبلغ</th><th style={s.th}>وضعیت</th><th style={s.th}></th></tr></thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td style={s.td}>{w.id}</td>
                        <td style={s.td}>{w.phone}</td>
                        <td style={s.td}>{fmt(w.amount)}</td>
                        <td style={s.td}><StatusBadge status={w.status} /></td>
                        <td style={s.td}>
                          {w.status === 'pending' && (
                            <>
                              <button style={s.btnSuccess} onClick={() => resolveWithdrawal(w.id, 'paid')}>پرداخت</button>{' '}
                              <button style={s.btnDanger} onClick={() => resolveWithdrawal(w.id, 'rejected')}>رد</button>
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

          {tab === 'diagnostics' && (
            <div style={s.tableCard}>
              <table style={s.table}>
                <thead><tr><th style={s.th}>ID</th><th style={s.th}>موبایل</th><th style={s.th}>خودرو</th><th style={s.th}>شرح</th><th style={s.th}>نتیجه</th></tr></thead>
                <tbody>
                  {diagnostics.length === 0 && <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#777' }}>خالی</td></tr>}
                  {diagnostics.map((d) => (
                    <tr key={d.id}>
                      <td style={s.td}>{d.id}</td>
                      <td style={s.td}>{d.phone || d.userId}</td>
                      <td style={s.td}>{d.carId}</td>
                      <td style={s.td}>{d.description}</td>
                      <td style={{ ...s.td, maxWidth: 280 }}>{d.resultPreview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'purchases' && (
            <div style={s.tableCard}>
              <table style={s.table}>
                <thead><tr><th style={s.th}>ID</th><th style={s.th}>موبایل</th><th style={s.th}>محصول</th><th style={s.th}>مبلغ</th><th style={s.th}>وضعیت</th></tr></thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td style={s.td}>{p.id}</td>
                      <td style={s.td}>{p.phone}</td>
                      <td style={s.td}>{p.productId}</td>
                      <td style={s.td}>{fmt(p.amount)}</td>
                      <td style={s.td}><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, accent }: { icon: string; title: string; value: string; accent: string }) {
  return (
    <div style={{ ...s.statCard, borderTop: `3px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: '#999' }}>{title}</div>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, CSSProperties> = {
    pending: badgeGold,
    paid: badgeOk,
    completed: badgeOk,
    rejected: { ...badgeMuted, color: '#e57373' },
  };
  const labels: Record<string, string> = { pending: 'در انتظار', paid: 'پرداخت', completed: 'موفق', rejected: 'رد' };
  return <span style={map[status] || badgeMuted}>{labels[status] || status}</span>;
}

const badgeOk: CSSProperties = { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.35)' };
const badgeGold: CSSProperties = { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(255,193,7,0.18)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.4)' };
const badgeMuted: CSSProperties = { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)' };

const s: Record<string, CSSProperties> = {
  shell: { minHeight: '100vh', background: 'linear-gradient(160deg, #0a0a0f 0%, #12121a 50%, #0d1117 100%)', color: '#e8e8e8', fontFamily: 'Tahoma, Vazirmatn, Arial, sans-serif' },
  layout: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 200, background: 'rgba(18,18,26,0.95)', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box' },
  sideBrand: { display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 13, textAlign: 'right', width: '100%' },
  navActive: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,152,0,0.35)', background: 'rgba(255,152,0,0.12)', color: '#ff9800', cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'right', width: '100%' },
  logoutBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(244,67,54,0.3)', background: 'rgba(244,67,54,0.08)', color: '#e57373', cursor: 'pointer', fontSize: 13 },
  main: { flex: 1, padding: '24px 28px', overflowX: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800 },
  pageSub: { margin: '4px 0 0', fontSize: 12, color: '#777' },
  spinner: { width: 20, height: 20, border: '2px solid rgba(255,152,0,0.2)', borderTopColor: '#ff9800', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  alertError: { background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.35)', color: '#ef9a9a', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 },
  statCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 14px' },
  toolbar: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' },
  tableCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'auto', padding: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888', fontWeight: 600 },
  td: { padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.25)', color: '#eee', fontSize: 13, marginBottom: 10, outline: 'none' },
  label: { display: 'block', fontSize: 12, color: '#999', marginBottom: 6 },
  btnPrimary: { width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ff9800, #f57c00)', color: '#111', fontWeight: 800, cursor: 'pointer', fontSize: 14 },
  btnPrimarySm: { padding: '8px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ff9800, #f57c00)', color: '#111', fontWeight: 700, cursor: 'pointer', fontSize: 12 },
  btnGhost: { padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#ccc', cursor: 'pointer', fontSize: 12 },
  btnGhostSm: { padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#ccc', cursor: 'pointer', fontSize: 12 },
  btnSuccess: { padding: '5px 10px', borderRadius: 8, border: 'none', background: 'rgba(76,175,80,0.25)', color: '#81c784', cursor: 'pointer', fontSize: 12 },
  btnDanger: { padding: '5px 10px', borderRadius: 8, border: 'none', background: 'rgba(244,67,54,0.2)', color: '#e57373', cursor: 'pointer', fontSize: 12 },
  chip: { padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 12 },
  chipActive: { padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,152,0,0.4)', background: 'rgba(255,152,0,0.15)', color: '#ff9800', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  loginCard: { width: 360, maxWidth: '92vw', margin: '10vh auto', background: 'rgba(18,18,26,0.95)', border: '1px solid rgba(255,152,0,0.25)', borderRadius: 20, padding: 28, textAlign: 'center' },
  loginBadge: { display: 'inline-block', fontSize: 11, letterSpacing: 2, color: '#ff9800', border: '1px solid rgba(255,152,0,0.4)', borderRadius: 6, padding: '2px 8px', marginBottom: 12 },
  logoCircle: { width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,152,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' },
  loginTitle: { margin: '0 0 6px', fontSize: 20, fontWeight: 800 },
  loginSub: { margin: '0 0 20px', color: '#777', fontSize: 13 },
};
