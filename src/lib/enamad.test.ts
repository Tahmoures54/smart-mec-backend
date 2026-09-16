import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ENAMAD_META_GUIDE,
  ENAMAD_META_TAG,
  ENAMAD_VERIFY_CODE,
  enamadFileResponse,
  enamadVerifyHtml,
  injectEnamadMeta,
  isEnamadCrawler,
} from './enamad';

describe('Enamad homepage meta tag', () => {
  it('embeds the Enamad meta tag in the root layout', () => {
    const layout = readFileSync(
      path.join(process.cwd(), 'src/app/layout.tsx'),
      'utf8'
    );

    expect(layout).toContain('name="enamad"');
    expect(layout).toContain('content={ENAMAD_VERIFY_CODE}');
    expect(layout).toContain('<head>');
  });

  it('treats empty, PHP, spoofed Mozilla, and unknown agents as crawlers', () => {
    expect(isEnamadCrawler('')).toBe(true);
    expect(isEnamadCrawler('PHP/8.2')).toBe(true);
    expect(isEnamadCrawler('curl/8.0')).toBe(true);
    expect(isEnamadCrawler('Go-http-client/1.1')).toBe(true);
    expect(isEnamadCrawler('Mozilla/5.0')).toBe(true);
    expect(isEnamadCrawler('Mozilla/5.0', '*/*')).toBe(true);
    expect(
      isEnamadCrawler(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128',
        'text/html,application/xhtml+xml'
      )
    ).toBe(false);
  });

  it('inserts the guide tag first in head', () => {
    const html = '<html><head><meta charset="utf-8"></head></html>';
    const injected = injectEnamadMeta(html);

    expect(injected.startsWith(`<html><head>${ENAMAD_META_GUIDE}`)).toBe(true);
    expect(injected).toContain(ENAMAD_META_TAG);
    expect(injectEnamadMeta(injected).split(ENAMAD_META_GUIDE)).toHaveLength(2);
  });

  it('builds a tiny HTML page Enamad can parse', () => {
    const html = enamadVerifyHtml();

    expect(html).toContain('http-equiv="Content-Type"');
    expect(html).toContain(ENAMAD_META_GUIDE);
    expect(html).toContain(`<title>${ENAMAD_VERIFY_CODE}</title>`);
    expect(html).toContain(`<h1>${ENAMAD_VERIFY_CODE}</h1>`);
    expect(html.indexOf(ENAMAD_META_GUIDE)).toBeLessThan(
      html.indexOf('<title>')
    );
  });

  it('returns HTTP 200 with the verification code as the file body', async () => {
    const response = enamadFileResponse();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=utf-8'
    );
    expect(response.headers.get('Content-Length')).toBe(
      String(ENAMAD_VERIFY_CODE.length)
    );
    expect(await response.text()).toBe(ENAMAD_VERIFY_CODE);
  });
});
