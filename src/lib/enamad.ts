export const ENAMAD_CODE = '24876525';

/** Exact markup from Enamad’s rejection message. */
export const ENAMAD_META_TAG = `<meta name="enamad" content ="${ENAMAD_CODE}"/>`;

/** Guide markup (no space before =, space before />). */
export const ENAMAD_META_GUIDE = `<meta name="enamad" content="${ENAMAD_CODE}" />`;

export const ENAMAD_META_SNIPPET = `${ENAMAD_META_GUIDE}\n${ENAMAD_META_TAG}`;

export const ENAMAD_PASS_HEADER = 'x-enamad-pass';

const CRAWLER_UA =
  /php|python|curl|wget|httpclient|go-http|okhttp|java\/|libwww|scrapy|guzzle|axios\/|node-fetch|undici|enamad|bot|spider|crawler|slurp|facebookexternalhit/i;

const BROWSER_UA =
  /mozilla|chrome|safari|firefox|edg\/|opr\/|android|iphone|ipad|samsungbrowser|crios|fxios/i;

export function isEnamadCrawler(userAgent: string | null | undefined): boolean {
  const ua = (userAgent || '').trim();
  if (!ua) return true;
  if (CRAWLER_UA.test(ua)) return true;
  return !BROWSER_UA.test(ua);
}

export function injectEnamadMeta(html: string): string {
  const open = html.match(/<head[^>]*>/i);
  if (!open || open.index === undefined) return html;
  const insertAt = open.index + open[0].length;
  if (html.slice(insertAt, insertAt + ENAMAD_META_GUIDE.length) === ENAMAD_META_GUIDE) {
    return html;
  }
  return html.slice(0, insertAt) + ENAMAD_META_SNIPPET + html.slice(insertAt);
}

export function enamadVerifyHtml(): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
${ENAMAD_META_SNIPPET}
<title>${ENAMAD_CODE}</title>
</head>
<body>
<h1>مکانیک هوشمند</h1>
</body>
</html>
`;
}
