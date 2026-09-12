import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDownloadLinks, primaryDownloadHref } from './site';

describe('download links', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the hosted APK and marks stores as coming soon', () => {
    const links = getDownloadLinks();
    expect(primaryDownloadHref()).toBe('/downloads/smart-mec.apk');
    expect(links[0]).toMatchObject({ id: 'apk', href: '/downloads/smart-mec.apk' });
    expect(links[1]?.href).toBeNull();
    expect(links[2]?.href).toBeNull();
  });

  it('uses public store URLs when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_APK_URL', 'https://cdn.example/app.apk');
    vi.stubEnv('NEXT_PUBLIC_CAFEBAZAAR_URL', 'https://cafebazaar.ir/app/ir.smartmec.app');
    vi.stubEnv('NEXT_PUBLIC_PLAY_STORE_URL', 'https://play.google.com/store/apps/details?id=ir.smartmec.app');

    const links = getDownloadLinks();
    expect(primaryDownloadHref()).toBe('https://cdn.example/app.apk');
    expect(links[1]?.href).toContain('cafebazaar.ir');
    expect(links[2]?.href).toContain('play.google.com');
  });
});
