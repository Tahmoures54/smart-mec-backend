import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const source = process.env.RESTORE_FROM || process.argv[2];
const target = process.env.DATABASE_PATH || '/app/db/sqlite.db';

if (!source) throw new Error('Usage: npm run db:restore -- /path/to/backup.sqlite.db');
if (!fs.existsSync(source)) throw new Error(`Backup not found: ${source}`);
if (path.resolve(source) === path.resolve(target)) throw new Error('Restore source and target must differ.');

fs.mkdirSync(path.dirname(target), { recursive: true });
const temp = `${target}.restore-${Date.now()}`;
const src = new Database(source, { readonly: true });
try {
  await src.backup(temp);
} finally {
  src.close();
}
const restored = new Database(temp);
try {
  restored.pragma('foreign_keys = ON');
  restored.prepare('PRAGMA integrity_check').get();
} finally {
  restored.close();
}
fs.renameSync(temp, target);
console.log(`SQLite database restored to: ${target}`);
