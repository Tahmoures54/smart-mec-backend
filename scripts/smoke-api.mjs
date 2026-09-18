const base = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const checks = [
  ['/api/health', 200],
  ['/api/products', 200],
  ['/api/cars', 200],
  ['/api/garages', 200],
];

let failed = 0;
for (const [path, expected] of checks) {
  try {
    const res = await fetch(base + path, { redirect: 'manual' });
    const ok = res.status === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${path} -> HTTP ${res.status}`);
    if (!ok) failed += 1;
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${path} -> ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  console.error(`${failed} smoke check(s) failed.`);
  process.exit(1);
}
console.log('Public API smoke checks passed.');
