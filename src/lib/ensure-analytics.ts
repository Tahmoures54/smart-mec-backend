import { getSqlite } from '@/db';
import { logger } from '@/utils/logger';

let done = false;

export async function ensureAnalyticsTables() {
  if (done) return;
  const sqlite = getSqlite();

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        session_id TEXT,
        user_id INTEGER,
        path TEXT,
        props TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events (event);`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at);`);

    // افزودن ستون‌ها به users در صورت نیاز (SQLite از IF NOT EXISTS پشتیبانی نمی‌کند)
    const addColumn = (table: string, column: string, def: string) => {
      try {
        sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
      } catch {
        // ستون از قبل وجود دارد
      }
    };

    addColumn('users', 'marketing_opt_in', 'INTEGER DEFAULT 0');
    addColumn('users', 'recovery_sms_at', 'INTEGER');

    done = true;
  } catch (e) {
    logger.warn('ensureAnalyticsTables', e);
  }
}
