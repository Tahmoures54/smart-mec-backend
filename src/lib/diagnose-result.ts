/**
 * Parse structured diagnose markdown into UI sections.
 */

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

/** Split AI markdown by ## / ### headings */
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

/** Extract bullet / numbered questions from a section body */
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

/** Find estimated cost snippets (تخمینی / باند هزینه) in full text */
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
