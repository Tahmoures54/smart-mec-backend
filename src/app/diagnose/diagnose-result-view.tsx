'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { markdownToHtml } from '@/lib/markdown';
import {
  extractCostHints,
  extractMechanicQuestions,
  parseDiagnoseSections,
  type DiagnoseSection,
  type SectionKind,
} from '@/lib/diagnose-result';

const KIND_STYLES: Record<
  SectionKind,
  { border: string; badge: string; label: string }
> = {
  status: {
    border: 'border-sky-400/30',
    badge: 'bg-sky-500/15 text-sky-200',
    label: 'وضعیت',
  },
  causes: {
    border: 'border-orange-400/35',
    badge: 'bg-orange-500/15 text-orange-200',
    label: 'علل',
  },
  questions: {
    border: 'border-emerald-400/35',
    badge: 'bg-emerald-500/15 text-emerald-200',
    label: 'سوال مکانیک',
  },
  warning: {
    border: 'border-amber-400/40',
    badge: 'bg-amber-500/15 text-amber-200',
    label: 'هشدار',
  },
  next: {
    border: 'border-violet-400/30',
    badge: 'bg-violet-500/15 text-violet-200',
    label: 'قدم بعد',
  },
  footer: {
    border: 'border-white/10',
    badge: 'bg-white/10 text-amber-100/70',
    label: 'نکته',
  },
  other: {
    border: 'border-white/10',
    badge: 'bg-white/10 text-amber-100/70',
    label: 'بخش',
  },
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function SectionCard({
  section,
  children,
}: {
  section: DiagnoseSection;
  children?: ReactNode;
}) {
  const style = KIND_STYLES[section.kind];
  const html = markdownToHtml(section.body || '');
  return (
    <article className={`rounded-2xl border bg-black/25 p-4 ${style.border}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.badge}`}>
          {style.label}
        </span>
        <h3 className="text-base font-bold text-amber-50">{section.title}</h3>
      </div>
      {children}
      {section.kind !== 'questions' && section.body ? (
        <div
          className="diagnose-result text-sm leading-8 text-amber-50/90"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </article>
  );
}

export function DiagnoseResultView({ text }: { text: string }) {
  const sections = useMemo(() => parseDiagnoseSections(text), [text]);
  const costHints = useMemo(() => extractCostHints(text), [text]);
  const questionSection = sections.find((s) => s.kind === 'questions');
  const questions = useMemo(
    () => (questionSection ? extractMechanicQuestions(questionSection.body) : []),
    [questionSection]
  );
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCopy(key: string, value: string) {
    const ok = await copyText(value);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    }
  }

  const mainSections = sections.filter((s) => s.kind !== 'questions');

  if (sections.length === 0) {
    return (
      <div
        className="diagnose-result text-sm leading-8 text-amber-50/90"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {costHints.length > 0 ? (
        <div className="rounded-2xl border border-orange-400/25 bg-orange-500/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold text-orange-200">
              تخمینی
            </span>
            <h3 className="text-sm font-bold text-amber-100">برآورد هزینه (تقریبی)</h3>
          </div>
          <ul className="space-y-1.5 text-sm text-amber-50/85">
            {costHints.map((h) => (
              <li key={h} className="leading-7">
                {h}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-5 text-amber-100/45">
            اعداد تقریبی‌اند و بسته به شهر، برند قطعه و اجرت فرق می‌کنند؛ ملاک نهایی نظر تعمیرگاه است.
          </p>
        </div>
      ) : null}

      {questions.length > 0 ? (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 shadow-[0_0_24px_rgba(16,185,129,0.08)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
                آماده کپی
              </span>
              <h3 className="text-base font-bold text-emerald-50">
                سوال‌هایی که از مکانیک بپرس
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                void handleCopy(
                  'all',
                  questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
                )
              }
              className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
            >
              {copied === 'all' ? 'کپی شد ✓' : 'کپی همه'}
            </button>
          </div>
          <ol className="space-y-2">
            {questions.map((q, i) => (
              <li
                key={`${i}-${q.slice(0, 24)}`}
                className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-amber-50/90"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-200">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 leading-7">{q}</span>
                <button
                  type="button"
                  onClick={() => void handleCopy(`q-${i}`, q)}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-emerald-300/90 hover:bg-white/5"
                  title="کپی"
                >
                  {copied === `q-${i}` ? '✓' : 'کپی'}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-emerald-100/50">
            این لیست را ببر تعمیرگاه تا مسیر تشخیص شفاف‌تر شود و کمتر هزینه اضافه پیشنهاد شود.
          </p>
        </div>
      ) : null}

      {mainSections.map((section, idx) => (
        <SectionCard key={`${section.kind}-${idx}`} section={section} />
      ))}
    </div>
  );
}
