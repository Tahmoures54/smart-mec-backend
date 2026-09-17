import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDownloadLinks, primaryDownloadHref } from './site';

describe('download links', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not advertise unavailable app downloads', () => {
    const links = getDownloadLinks();
    expect(primaryDownloadHref()).toBeNull();
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ id: 'apk', href: null });
    expect(links[1]?.href).toBeNull();
  });

  it('uses APK and Cafe Bazaar URLs when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_APK_URL', 'https://cdn.example/app.apk');
    vi.stubEnv('NEXT_PUBLIC_CAFEBAZAAR_URL', 'https://cafebazaar.ir/app/ir.smartmec.app');
    vi.stubEnv('NEXT_PUBLIC_PLAY_STORE_URL', 'https://play.google.com/store/apps/details?id=ir.smartmec.app');

    const links = getDownloadLinks();
    expect(primaryDownloadHref()).toBe('https://cdn.example/app.apk');
    expect(links[0]?.href).toBe('https://cdn.example/app.apk');
    expect(links[1]?.href).toContain('cafebazaar.ir');
    expect(links).toHaveLength(2);
  });
});
