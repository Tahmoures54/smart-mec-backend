import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TAG = '<meta name="enamad" content="24876525" />';
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
  if (html.includes(`<head>${TAG}`) || html.includes(`<head><meta charSet="utf-8"/>${TAG}`)) {
    return html;
  }
  if (html.includes('<head><meta charSet="utf-8"/>')) {
    return html.replace('<head><meta charSet="utf-8"/>', `<head><meta charSet="utf-8"/>${TAG}`);
  }
  return html.replace('<head>', `<head>${TAG}`);
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

console.log(`inject-enamad-meta: updated ${changed} html files`);
