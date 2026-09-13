import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ENAMAD_META_TAG,
  enamadVerifyHtml,
  injectEnamadMeta,
  isEnamadCrawler,
} from './enamad';

describe('Enamad homepage meta tag', () => {
  it('is embedded in the root layout head with Enamad’s exact markup', () => {
    const layout = readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    expect(layout).toContain(ENAMAD_META_TAG);
    expect(layout).toContain('<head>');
  });

  it('treats empty and PHP user agents as crawlers', () => {
    expect(isEnamadCrawler('')).toBe(true);
    expect(isEnamadCrawler('PHP/8.2')).toBe(true);
    expect(isEnamadCrawler('curl/8.0')).toBe(true);
    expect(isEnamadCrawler('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128')).toBe(false);
  });

  it('inserts the exact tag as the first child of head', () => {
    const html = '<html><head><meta charset="utf-8"></head></html>';
    expect(injectEnamadMeta(html)).toBe(
      `<html><head>${ENAMAD_META_TAG}<meta charset="utf-8"></head></html>`
    );
    expect(injectEnamadMeta(injectEnamadMeta(html))).toContain(ENAMAD_META_TAG);
    expect(injectEnamadMeta(injectEnamadMeta(html)).split(ENAMAD_META_TAG)).toHaveLength(2);
  });

  it('builds a tiny homepage whose head starts with the exact Enamad tag', () => {
    const html = enamadVerifyHtml();
    expect(html).toContain(`<head>\n<meta charset="utf-8">\n${ENAMAD_META_TAG}`);
  });
});
