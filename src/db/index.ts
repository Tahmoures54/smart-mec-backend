import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { logger } from '@/utils/logger';

const isBuilding =
  process.env.npm_lifecycle_event === 'build' ||
  process.env.NEXT_PHASE === 'phase-production-build';

type Database = NeonHttpDatabase<typeof schema>;

let sqlClient: ReturnType<typeof neon> | null = null;
let dbInstance: Database | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    if (isBuilding) {
      throw new Error('DATABASE_URL is not set. Skipping DB init at build time.');
    }
    throw new Error('❌ DATABASE_URL is not set in environment variables');
  }

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

function getDb(): Database {
  if (!dbInstance) {
    dbInstance = drizzle(getSql(), { schema }) as Database;
  }
  return dbInstance;
}

export const db = new Proxy({} as Database, {
  get(_, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});

async function ensureTables() {
  try {
    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        credits INTEGER DEFAULT 0 NOT NULL,
        is_golden BOOLEAN DEFAULT false NOT NULL,
        golden_expires_at TEXT,
        monthly_limit INTEGER DEFAULT 200,
        referral_code TEXT UNIQUE,
        referred_by INTEGER REFERENCES users(id),
        earnings INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS golden_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        year_month TEXT NOT NULL,
        count INTEGER DEFAULT 0 NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS monthly_free_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        year_month TEXT NOT NULL,
        free_count INTEGER DEFAULT 0 NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        is_used BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS diagnostics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        car_id TEXT NOT NULL,
        description TEXT NOT NULL,
        result TEXT NOT NULL,
        audio_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        product_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        authority TEXT UNIQUE,
        ref_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        amount INTEGER NOT NULL,
        card_number TEXT NOT NULL,
        full_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // 🔧 اگر جدول otps از قبل با ستون INTEGER ساخته شده، به BIGINT تبدیل می‌شود
    try {
      await sql`ALTER TABLE otps ALTER COLUMN expires_at TYPE BIGINT;`;
    } catch (alterError) {
      logger.warn(
        'Could not alter otps.expires_at type (maybe already BIGINT)',
        alterError
      );
    }

    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 200;`;
    } catch {
      // column already exists
    }

    logger.info('✅ Database tables verified and ready.');
  } catch (error) {
    logger.error('❌ Failed to ensure database tables:', error);
    // ✅ دوباره پرتاب می‌کنیم تا در route قابل مدیریت باشد
    throw error;
  }
}

let tablesReady: Promise<void> | null = null;

export function ensureDbReady(): Promise<void> {
  if (isBuilding) {
    return Promise.resolve();
  }

  if (!process.env.DATABASE_URL) {
    return Promise.reject(
      new Error('❌ DATABASE_URL is not set in environment variables')
    );
  }

  if (!tablesReady) {
    tablesReady = ensureTables();
  }
  return tablesReady;
}

if (!isBuilding) {
  ensureDbReady()
    .then(() => logger.info('✅ Neon PostgreSQL connected successfully.'))
    .catch((err) => logger.error('❌ Database connection failed:', err.message));
}
