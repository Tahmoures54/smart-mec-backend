import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ENAMAD_META = '<meta name="enamad" content="24876525" />';

describe('Enamad homepage meta tag', () => {
  it('is embedded in the root layout head with Enamad’s exact markup', () => {
    const layout = readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    expect(layout).toContain(ENAMAD_META);
    expect(layout).toContain('<head>');
  });
});
