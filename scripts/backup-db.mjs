import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const source = process.env.DATABASE_PATH || '/app/db/sqlite.db';
const target = process.env.BACKUP_PATH || path.resolve(
  process.cwd(),
  'backups',
  `smart-mec-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite.db`
);

if (!fs.existsSync(source)) {
  throw new Error(`Database not found: ${source}`);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
const db = new Database(source, { readonly: false });
try {
  await db.backup(target);
  console.log(`SQLite backup created: ${target}`);
} finally {
  db.close();
}
