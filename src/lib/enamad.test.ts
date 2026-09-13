import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ENAMAD_META_GUIDE,
  ENAMAD_META_SNIPPET,
  ENAMAD_META_TAG,
  enamadVerifyHtml,
  injectEnamadMeta,
  isEnamadCrawler,
} from './enamad';

describe('Enamad homepage meta tag', () => {
  it('embeds the Enamad meta tag in the root layout', () => {
    const layout = readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    expect(layout).toContain('<meta name="enamad" content="24876525" />');
    expect(layout).toContain('<head>');
  });

  it('treats empty, PHP, and unknown agents as crawlers', () => {
    expect(isEnamadCrawler('')).toBe(true);
    expect(isEnamadCrawler('PHP/8.2')).toBe(true);
    expect(isEnamadCrawler('curl/8.0')).toBe(true);
    expect(isEnamadCrawler('Go-http-client/1.1')).toBe(true);
    expect(isEnamadCrawler('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128')).toBe(false);
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
    expect(html).toContain(ENAMAD_META_SNIPPET);
    expect(html).toContain(`<title>${'24876525'}</title>`);
  });

  it('exposes the Enamad verification file at the site root', () => {
    const file = readFileSync(path.join(process.cwd(), 'public/24876525.txt'), 'utf8').trim();
    expect(file).toBe('24876525');
  });
});
