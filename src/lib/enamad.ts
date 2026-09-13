export const ENAMAD_CODE = '24876525';

/** Exact markup from Enamad’s rejection message. */
export const ENAMAD_META_TAG = `<meta name="enamad" content ="${ENAMAD_CODE}"/>`;

/** Extra spacings Enamad has asked for in different screens. */
export const ENAMAD_META_SNIPPET = [
  ENAMAD_META_TAG,
  `<meta name="enamad" content="${ENAMAD_CODE}"/>`,
  `<meta name="enamad" content="${ENAMAD_CODE}" />`,
].join('');

export const ENAMAD_PASS_HEADER = 'x-enamad-pass';

const CRAWLER_UA =
  /php|python|curl|wget|httpclient|go-http|okhttp|java\/|libwww|scrapy|guzzle|axios\/|node-fetch|undici|enamad|bot|spider|crawler|slurp|facebookexternalhit/i;

export function isEnamadCrawler(userAgent: string | null | undefined): boolean {
  const ua = (userAgent || '').trim();
  if (!ua) return true;
  return CRAWLER_UA.test(ua);
}

export function injectEnamadMeta(html: string): string {
  const open = html.match(/<head[^>]*>/i);
  if (!open || open.index === undefined) return html;
  const insertAt = open.index + open[0].length;
  if (html.slice(insertAt, insertAt + ENAMAD_META_TAG.length) === ENAMAD_META_TAG) {
    return html;
  }
  return html.slice(0, insertAt) + ENAMAD_META_SNIPPET + html.slice(insertAt);
}

export function enamadVerifyHtml(): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
${ENAMAD_META_SNIPPET}
<title>مکانیک هوشمند</title>
</head>
<body>
<h1>مکانیک هوشمند</h1>
</body>
</html>
`;
}
