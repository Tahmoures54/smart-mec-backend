// ═══════════════════════════════════════════════════════════
// Database Connection - Smart-MEC
// libSQL / Turso (Vercel-compatible) + local file fallback
// ═══════════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { logger } from '@/utils/logger';

const url =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'file:./app.db';

const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: url.replace(/^['"]|['"]$/g, ''),
  ...(authToken ? { authToken } : {}),
});

export const db = drizzle(client, { schema });

async function ensureTables() {
  try {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        credits INTEGER DEFAULT 0 NOT NULL,
        is_golden INTEGER DEFAULT 0 NOT NULL,
        golden_expires_at TEXT,
        monthly_limit INTEGER DEFAULT 200,
        referral_code TEXT UNIQUE,
        referred_by INTEGER REFERENCES users(id),
        earnings INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS golden_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        year_month TEXT NOT NULL,
        count INTEGER DEFAULT 0 NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        is_used INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS diagnostics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        car_id TEXT NOT NULL,
        description TEXT NOT NULL,
        result TEXT NOT NULL,
        audio_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        product_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        authority TEXT UNIQUE,
        ref_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        amount INTEGER NOT NULL,
        card_number TEXT NOT NULL,
        full_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        admin_note TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    try {
      await client.execute(
        `ALTER TABLE users ADD COLUMN monthly_limit INTEGER DEFAULT 200;`
      );
    } catch {
      // column already exists
    }

    logger.info('✅ Database tables verified and ready.');
  } catch (error) {
    logger.error('❌ Failed to ensure database tables:', error);
  }
}

const isBuilding =
  process.env.npm_lifecycle_event === 'build' ||
  process.env.NEXT_PHASE === 'phase-production-build';

let tablesReady: Promise<void> | null = null;

/** فراخوانی قبل از اولین کوئری در runtime (نه در بیلد) */
export function ensureDbReady(): Promise<void> {
  if (isBuilding) return Promise.resolve();
  if (!tablesReady) {
    tablesReady = ensureTables();
  }
  return tablesReady;
}

// در سرور واقعی جدول‌ها را بساز
if (!isBuilding) {
  ensureDbReady().then(() => {
    logger.info(`✅ libSQL connected (${url.startsWith('libsql') || url.startsWith('https') ? 'Turso remote' : 'local file'})`);
  });
}
