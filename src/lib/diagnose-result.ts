/**
 * Parse structured diagnose markdown / JSON into UI sections.
 */

import type { StructuredCause, StructuredDiagnose } from '@/types';

export type SectionKind =
  | 'status'
  | 'causes'
  | 'questions'
  | 'warning'
  | 'next'
  | 'footer'
  | 'other';

export type DiagnoseSection = {
  title: string;
  body: string;
  kind: SectionKind;
};

function classifyTitle(title: string): SectionKind {
  const t = title.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '').trim();
  if (/وضعیت|فوریت/.test(t)) return 'status';
  if (/علل|محتمل/.test(t)) return 'causes';
  if (/بپرس|سوال|مکانیک/.test(t)) return 'questions';
  if (/مراقب|هشدار|پیشنهاد/.test(t)) return 'warning';
  if (/قدم|بعدی/.test(t)) return 'next';
  if (/نکته|پایانی|سلب/.test(t)) return 'footer';
  return 'other';
}

export function parseDiagnoseSections(markdown: string): DiagnoseSection[] {
  const text = (markdown || '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const lines = text.split('\n');
  const sections: DiagnoseSection[] = [];
  let currentTitle = '';
  let currentBody: string[] = [];

  const flush = () => {
    if (!currentTitle && currentBody.length === 0) return;
    const title = currentTitle || 'نتیجه';
    sections.push({
      title,
      body: currentBody.join('\n').trim(),
      kind: classifyTitle(title),
    });
    currentTitle = '';
    currentBody = [];
  };

  for (const line of lines) {
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      flush();
      currentTitle = h[2].trim();
      continue;
    }
    currentBody.push(line);
  }
  flush();

  return sections.filter((s) => s.body || s.title);
}

export function extractMechanicQuestions(body: string): string[] {
  const lines = (body || '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m =
      /^[-*•]\s+(.+)$/.exec(line) ||
      /^\d+[.)]\s+(.+)$/.exec(line) ||
      /^[۰-۹]+[.)]\s+(.+)$/.exec(line);
    if (m) {
      const q = m[1].replace(/\*\*/g, '').trim();
      if (q.length >= 3) out.push(q);
    }
  }
  if (out.length === 0) {
    for (const raw of lines) {
      const line = raw.replace(/\*\*/g, '').trim();
      if (line.length >= 8 && !line.startsWith('#')) out.push(line);
    }
  }
  return out.slice(0, 8);
}

export function extractCostHints(markdown: string): string[] {
  const text = markdown || '';
  const hints: string[] = [];
  const patterns = [
    /تخمینی[^\n.]{0,80}/g,
    /باند هزینه[^\n.]{0,60}/g,
    /هزینه[^:\n]{0,10}:[^\n]{0,80}/g,
  ];
  for (const re of patterns) {
    const matches = text.match(re);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.replace(/\*\*/g, '').trim();
        if (cleaned.length > 6 && !hints.includes(cleaned)) hints.push(cleaned);
      }
    }
  }
  return hints.slice(0, 6);
}

const URGENCY_LABEL: Record<string, string> = {
  green: '🟢 می‌تونی با احتیاط ادامه بدی و وقت بگیری',
  yellow: '🟡 بهتره زود بررسی بشه',
  red: '🔴 فعلاً رانندگی نکن / فوری ببر تعمیرگاه',
};

const PROB_FA: Record<string, string> = {
  high: 'بالا',
  medium: 'متوسط',
  low: 'پایین',
};

const COST_FA: Record<string, string> = {
  low: 'جزئی',
  medium: 'متوسط',
  high: 'سنگین',
};

export function tryParseStructuredDiagnose(raw: string): StructuredDiagnose | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(text);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Partial<StructuredDiagnose>;
    if (!obj || typeof obj !== 'object') return null;
    if (!obj.statusSummary && !Array.isArray(obj.causes)) return null;
    const causes: StructuredCause[] = Array.isArray(obj.causes)
      ? obj.causes.slice(0, 3).map((c) => ({
          title: String(c?.title || 'علت نامشخص'),
          probability: String(c?.probability || 'medium'),
          why: c?.why ? String(c.why) : undefined,
          costBand: String(c?.costBand || 'medium'),
          costEstimate: c?.costEstimate ? String(c.costEstimate) : null,
          diyCheck: c?.diyCheck ? String(c.diyCheck) : null,
        }))
      : [];
    return {
      urgency: String(obj.urgency || 'yellow'),
      statusSummary: String(obj.statusSummary || ''),
      causes,
      mechanicQuestions: Array.isArray(obj.mechanicQuestions)
        ? obj.mechanicQuestions.map(String).filter(Boolean).slice(0, 8)
        : [],
      warnings: Array.isArray(obj.warnings)
        ? obj.warnings.map(String).filter(Boolean).slice(0, 4)
        : [],
      nextStep: String(obj.nextStep || ''),
      footer: obj.footer ? String(obj.footer) : undefined,
    };
  } catch {
    return null;
  }
}

export function structuredToMarkdown(s: StructuredDiagnose): string {
  const lines: string[] = [];
  lines.push('## وضعیت کلی');
  lines.push(URGENCY_LABEL[s.urgency] || s.urgency);
  if (s.statusSummary) lines.push(s.statusSummary);
  lines.push('');
  lines.push('## علل محتمل (به ترتیب احتمال)');
  for (const c of s.causes) {
    const prob = PROB_FA[c.probability] || c.probability;
    const band = COST_FA[c.costBand] || c.costBand;
    lines.push(`- **${c.title}** — احتمال: ${prob}`);
    if (c.why) lines.push(`  - ${c.why}`);
    lines.push(`  - باند هزینه: ${band}`);
    if (c.costEstimate) lines.push(`  - تخمینی: ${c.costEstimate}`);
    if (c.diyCheck) lines.push(`  - چک اولیه: ${c.diyCheck}`);
  }
  lines.push('');
  lines.push('## قبل از تعمیرگاه این‌ها را بپرس');
  for (const q of s.mechanicQuestions) lines.push(`- ${q}`);
  lines.push('');
  lines.push('## ⚠️ مراقب این پیشنهادها باش');
  for (const w of s.warnings) lines.push(`- ${w}`);
  lines.push('');
  lines.push('## قدم بعدی پیشنهادی');
  lines.push(s.nextStep || 'بازدید حضوری از تعمیرگاه معتبر.');
  lines.push('');
  lines.push('## نکته پایانی');
  lines.push(
    s.footer ||
      'این تحلیل راهنمای اولیه است؛ برای تعمیر نهایی بازدید حضوری لازم است.'
  );
  return lines.join('\n');
}
