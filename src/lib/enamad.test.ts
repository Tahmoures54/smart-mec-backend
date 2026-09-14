import { describe, expect, it } from 'vitest';
import {
  ENAMAD_SEAL_CODE,
  ENAMAD_SEAL_HREF,
  ENAMAD_SEAL_HTML,
  ENAMAD_SEAL_ID,
  ENAMAD_SEAL_IMG,
} from '@/lib/enamad';

describe('نماد اعتماد الکترونیکی', () => {
  it('لینک و تصویر رسمی اینماد را با شناسه مجوز دارد', () => {
    expect(ENAMAD_SEAL_ID).toBe('7731207');
    expect(ENAMAD_SEAL_CODE).toBe('Q14UpKWtFFDXzZarnOhA5dzChbURT0br');
    expect(ENAMAD_SEAL_HREF).toBe(
      'https://trustseal.enamad.ir/?id=7731207&Code=Q14UpKWtFFDXzZarnOhA5dzChbURT0br'
    );
    expect(ENAMAD_SEAL_IMG).toBe(
      'https://trustseal.enamad.ir/logo.aspx?id=7731207&Code=Q14UpKWtFFDXzZarnOhA5dzChbURT0br'
    );
  });

  it('HTML رسمی را بدون noreferrer نگه می‌دارد', () => {
    expect(ENAMAD_SEAL_HTML).toContain("referrerpolicy='origin'");
    expect(ENAMAD_SEAL_HTML).toContain(`code='${ENAMAD_SEAL_CODE}'`);
    expect(ENAMAD_SEAL_HTML).not.toContain('noreferrer');
  });
});
