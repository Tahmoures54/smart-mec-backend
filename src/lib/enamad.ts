export const ENAMAD_CODE = '24876525';

export const ENAMAD_FILE_NAME = `${ENAMAD_CODE}.txt`;
export const ENAMAD_FILE_PATH = `/${ENAMAD_FILE_NAME}`;
/**
 * Enamad’s UI says «فایل خالی», but its checker treats an empty body as
 * «صفحه بارگذاری نشده». Serve the verification code at /24876525.txt.
 */
export const ENAMAD_FILE_BODY = ENAMAD_CODE;
export const ENAMAD_FILE_CONTENT_TYPE = 'text/plain; charset=utf-8';

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

export function isEnamadCrawler(
  userAgent: string | null | undefined,
  accept?: string | null
): boolean {
  const ua = (userAgent || '').trim();
  if (!ua) return true;
  if (CRAWLER_UA.test(ua)) return true;
  if (!BROWSER_UA.test(ua)) return true;

  const acc = (accept || '').trim();
  // Browser-like UA without an HTML Accept is usually PHP/file_get_contents spoofing Mozilla.
  if (acc && !/text\/html/i.test(acc)) return true;
  if (!acc) return true;
  return false;
}

export function enamadFileHeaders(): HeadersInit {
  return {
    'Content-Type': ENAMAD_FILE_CONTENT_TYPE,
    'Content-Length': String(ENAMAD_FILE_BODY.length),
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  };
}

export function enamadFileResponse(): Response {
  return new Response(ENAMAD_FILE_BODY, {
    status: 200,
    headers: enamadFileHeaders(),
  });
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
${ENAMAD_META_GUIDE}
<title>${ENAMAD_CODE}</title>
</head>
<body>
<h1>${ENAMAD_CODE}</h1>
</body>
</html>
`;
}
