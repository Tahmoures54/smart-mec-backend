import type { CSSProperties } from 'react';

function statusFa(s: string) {
  const m: Record<string, string> = {
    completed: 'موفق',
    pending: 'در انتظار',
    failed: 'ناموفق',
    cancelled: 'لغو',
  };
  return m[s] || s;
}
function statusColor(s: string) {
  const m: Record<string, string> = {
    completed: '#66bb6a',
    pending: '#ff9800',
    failed: '#e57373',
    cancelled: '#9e9e9e',
  };
  return m[s] || '#78909c';
}

function fillDays(rows: any[], days: number, valueKey: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(String(r.day).slice(0, 10), Number(r[valueKey] ?? r.count ?? r.amount ?? 0));
  }
  const out: { day: string; value: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, value: map.get(key) || 0 });
  }
  return out;
}

function FunnelBars({
  steps,
  data,
}: {
  steps: { key: string; label: string; color: string }[];
  data: Record<string, number>;
}) {
  const max = Math.max(1, ...steps.map((s) => Number(data[s.key] || 0)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((s) => {
        const v = Number(data[s.key] || 0);
        const pct = Math.round((v / max) * 100);
        return (
          <div key={s.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#ccc' }}>{s.label}</span>
              <span style={{ color: s.color, fontWeight: 700 }}>{v.toLocaleString('fa-IR')}</span>
            </div>
            <div style={{ height: 10, background: '#222', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: s.color,
                  borderRadius: 999,
                  transition: 'width .4s',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({
  points,
  color,
  formatValue,
}: {
  points: { day: string; value: number }[];
  color: string;
  formatValue?: (n: number) => string;
}) {
  const vals = points.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const w = 320;
  const h = 140;
  const pad = 16;
  const coords = vals.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, vals.length - 1);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const poly = coords.join(' ');
  const area = `${pad},${h - pad} ${poly} ${w - pad},${h - pad}`;
  const last = vals[vals.length - 1] || 0;
  const gid = `g-${color.replace('#', '')}`;
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 8 }}>
        {(formatValue || ((n: number) => n.toLocaleString('fa-IR')))(last)}
        <span style={{ fontSize: 11, color: '#777', fontWeight: 500, marginRight: 8 }}>آخرین روز</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline
          points={poly}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {vals.map((v, i) => {
          const x = pad + (i * (w - pad * 2)) / Math.max(1, vals.length - 1);
          const y = h - pad - (v / max) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r={i === vals.length - 1 ? 4 : 2.5} fill={color} />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', marginTop: 4 }}>
        <span>{points[0]?.day?.slice(5) || ''}</span>
        <span>{points[points.length - 1]?.day?.slice(5) || ''}</span>
      </div>
    </div>
  );
}

function BarChart({ points, color }: { points: { day: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150, paddingTop: 8 }}>
      {points.map((p) => (
        <div key={p.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            title={`${p.day}: ${p.value}`}
            style={{
              width: '100%',
              maxWidth: 18,
              height: `${Math.max(4, (p.value / max) * 120)}px`,
              background: color,
              borderRadius: '6px 6px 2px 2px',
              opacity: p.value ? 1 : 0.25,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function DonutChart({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = Math.max(1, items.reduce((a, b) => a + b.value, 0));
  let acc = 0;
  const r = 48;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#222" strokeWidth="14" />
        {items.map((it) => {
          const frac = it.value / total;
          const dash = frac * c;
          const gap = c - dash;
          const rot = (acc / total) * 360 - 90;
          acc += it.value;
          return (
            <circle
              key={it.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={it.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rot} 60 60)`}
            />
          );
        })}
        <text x="60" y="64" textAnchor="middle" fill="#eee" fontSize="14" fontWeight="700">
          {total.toLocaleString('fa-IR')}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color }} />
            <span style={{ color: '#aaa' }}>{it.label}</span>
            <span style={{ color: '#eee', fontWeight: 700 }}>{it.value.toLocaleString('fa-IR')}</span>
          </div>
        ))}
        {items.length === 0 && <span style={{ color: '#666' }}>داده‌ای نیست</span>}
      </div>
    </div>
  );
}

function HBarChart({
  items,
  color,
}: {
  items: { label: string; value: number; sub?: string }[];
  color: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div style={{ color: '#666', fontSize: 13 }}>هنوز فروشی ثبت نشده</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: '#ccc', fontFamily: 'monospace' }}>{it.label}</span>
            <span style={{ color: '#eee' }}>
              {it.value.toLocaleString('fa-IR')}
              {it.sub ? <span style={{ color: '#777', marginRight: 8 }}>{it.sub}</span> : null}
            </span>
          </div>
          <div style={{ height: 8, background: '#222', borderRadius: 999 }}>
            <div
              style={{
                width: `${(it.value / max) * 100}%`,
                height: '100%',
                background: color,
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const chartTitle: CSSProperties = { fontSize: 13, fontWeight: 700, color: '#aaa', marginBottom: 12 };
const chartCard: CSSProperties = {
  background: '#1a1a1a',
  borderRadius: 16,
  padding: 16,
  border: '1px solid #222',
};
const chartGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
  gap: 14,
  marginTop: 16,
};
const statGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
  gap: 12,
};

function MiniStat({
  icon,
  title,
  value,
  accent,
}: {
  icon: string;
  title: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 14, padding: 14, borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export function AdminDashboardCharts({ dash, fmt }: { dash: any; fmt: (n: number) => string }) {
  return (
    <div>
      <div style={statGrid}>
        <MiniStat icon="👥" title="کاربران" value={fmt(dash.users)} accent="#42a5f5" />
        <MiniStat icon="💰" title="درآمد کل" value={`${fmt(dash.revenue)} ت`} accent="#66bb6a" />
        <MiniStat icon="🧠" title="عیب‌یابی‌ها" value={fmt(dash.diagnostics)} accent="#ab47bc" />
        <MiniStat icon="🧾" title="تراکنش‌ها" value={fmt(dash.purchases)} accent="#29b6f6" />
        <MiniStat icon="⏳" title="برداشت معلق" value={fmt(dash.pendingWithdrawals)} accent="#ff9800" />
        <MiniStat icon="🔧" title="تعمیرگاه‌ها" value={fmt(dash.garages || 0)} accent="#ffa726" />
        <MiniStat
          icon="⭐"
          title="ویژه / فعال"
          value={`${fmt(dash.garagesFeatured || 0)} / ${fmt(dash.garagesActive || 0)}`}
          accent="#ffca28"
        />
        <MiniStat
          icon="🎁"
          title="درآمد رفرال"
          value={`${fmt(dash.totalReferralEarnings || 0)} ت`}
          accent="#26c6da"
        />
      </div>

      <div style={chartGrid}>
        <div style={chartCard}>
          <div style={chartTitle}>قیف رفتار (۷ روز اخیر)</div>
          <FunnelBars
            steps={[
              { key: 'diagnose_started', label: 'شروع تشخیص', color: '#42a5f5' },
              { key: 'diagnose_success', label: 'تشخیص موفق', color: '#66bb6a' },
              { key: 'buy_view', label: 'بازدید خرید', color: '#ab47bc' },
              { key: 'buy_click', label: 'کلیک خرید', color: '#ffa726' },
              { key: 'pay_success', label: 'پرداخت موفق', color: '#26a69a' },
            ]}
            data={dash.funnel7d || {}}
          />
        </div>

        <div style={chartCard}>
          <div style={chartTitle}>عیب‌یابی روزانه (۱۴ روز)</div>
          <LineChart points={fillDays(dash.seriesDiagnostics || [], 14, 'count')} color="#ab47bc" />
        </div>

        <div style={chartCard}>
          <div style={chartTitle}>درآمد روزانه (۱۴ روز)</div>
          <LineChart
            points={fillDays(dash.seriesRevenue || [], 14, 'amount')}
            color="#66bb6a"
            formatValue={(n) => fmt(n)}
          />
        </div>

        <div style={chartCard}>
          <div style={chartTitle}>کاربران جدید (۱۴ روز)</div>
          <BarChart points={fillDays(dash.seriesUsers || [], 14, 'count')} color="#42a5f5" />
        </div>

        <div style={chartCard}>
          <div style={chartTitle}>وضعیت پرداخت‌ها</div>
          <DonutChart
            items={(dash.purchaseStatus || []).map((x: any) => ({
              label: statusFa(x.status),
              value: Number(x.count || 0),
              color: statusColor(x.status),
            }))}
          />
        </div>

        <div style={chartCard}>
          <div style={chartTitle}>محصولات پرفروش</div>
          <HBarChart
            items={(dash.topProducts || []).map((x: any) => ({
              label: x.productId,
              value: Number(x.count || 0),
              sub: `${fmt(x.revenue || 0)} ت`,
            }))}
            color="#ff9800"
          />
        </div>
      </div>
    </div>
  );
}
