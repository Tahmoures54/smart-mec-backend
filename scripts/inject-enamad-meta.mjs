import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Domain verification code (must match public/24876525.txt and layout meta)
const ENAMAD_VERIFY_CODE = '24876525';
const TAG = `<meta name="enamad" content="${ENAMAD_VERIFY_CODE}" />`;

const ROOT = path.join(process.cwd(), '.next/server');

async function walk(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function inject(html) {
  if (!html.includes('<head>')) return html;

  // Strip any previous enamad meta so only one consistent tag remains
  const cleaned = html.replace(
    /<meta\s+name=["']enamad["']\s+content\s*=\s*["'][^"']*["']\s*\/?>/gi,
    ''
  );

  return cleaned.replace('<head>', `<head>${TAG}`);
}

const files = await walk(ROOT);
let changed = 0;
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const next = inject(html);
  if (next === html) continue;
  await writeFile(file, next);
  changed += 1;
}

console.log(`inject-enamad-meta: updated ${changed} html files (verify: ${ENAMAD_VERIFY_CODE})`);
