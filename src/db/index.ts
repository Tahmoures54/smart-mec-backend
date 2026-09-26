import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { logger } from '@/utils/logger';

const isBuilding =
  process.env.npm_lifecycle_event === 'build' ||
  process.env.NEXT_PHASE === 'phase-production-build';

type DrizzleDb = BetterSQLite3Database<typeof schema>;

const DB_PATH = process.env.DATABASE_PATH || '/app/db/sqlite.db';

let sqlite: Database.Database | null = null;
let dbInstance: DrizzleDb | null = null;

export function getSqlite(): Database.Database {
  if (!sqlite) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    sqlite = new Database(DB_PATH);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('foreign_keys = ON');
  }
  return sqlite;
}

function getDb(): DrizzleDb {
  if (!dbInstance) dbInstance = drizzle(getSqlite(), { schema });
  return dbInstance;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    return typeof value === 'function' ? value.bind(realDb) : value;
  },
});

async function ensureTables() {
  try {
    const client = getSqlite();

    client.exec(`
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
        marketing_opt_in INTEGER DEFAULT 0 NOT NULL,
        recovery_sms_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS golden_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        year_month TEXT NOT NULL,
        count INTEGER DEFAULT 0 NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS monthly_free_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        year_month TEXT NOT NULL,
        free_count INTEGER DEFAULT 0 NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        is_used INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS diagnostics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        car_id TEXT NOT NULL,
        description TEXT NOT NULL,
        result TEXT NOT NULL,
        request_id TEXT,
        year INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        product_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        authority TEXT UNIQUE,
        ref_id TEXT,
        garage_id INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        card_number TEXT,
        full_name TEXT,
        status TEXT DEFAULT 'pending' NOT NULL,
        admin_note TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS garages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        rating REAL,
        reviews_count INTEGER DEFAULT 0,
        specialties TEXT,
        photo_url TEXT,
        website TEXT,
        description TEXT,
        is_open INTEGER DEFAULT 1,
        is_featured INTEGER DEFAULT 0 NOT NULL,
        is_verified INTEGER DEFAULT 0 NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        subscription_tier TEXT DEFAULT 'free' NOT NULL,
        subscription_expires_at TEXT,
        city TEXT,
        owner_user_id INTEGER REFERENCES users(id),
        chat_status TEXT DEFAULT 'none' NOT NULL,
        show_in_chat INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        diagnostic_id INTEGER REFERENCES diagnostics(id),
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        session_id TEXT,
        user_id INTEGER,
        path TEXT,
        props TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users (referred_by);
      CREATE INDEX IF NOT EXISTS idx_golden_usage_user ON golden_usage (user_id, year_month);
      CREATE INDEX IF NOT EXISTS idx_monthly_free_usage_user ON monthly_free_usage (user_id, year_month);
      CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps (phone);
      CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps (expires_at);
      CREATE INDEX IF NOT EXISTS idx_diagnostics_user_id ON diagnostics (user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_diagnostics_request_id ON diagnostics (request_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases (user_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_authority ON purchases (authority);
      CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals (user_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals (status);
      CREATE INDEX IF NOT EXISTS idx_garages_lat_lng ON garages (lat, lng);
      CREATE INDEX IF NOT EXISTS idx_garages_active ON garages (is_active);
      CREATE INDEX IF NOT EXISTS idx_garages_featured ON garages (is_featured);
      CREATE INDEX IF NOT EXISTS idx_garages_city ON garages (city);
      CREATE INDEX IF NOT EXISTS idx_garages_owner ON garages (owner_user_id);
      CREATE INDEX IF NOT EXISTS idx_garages_show_chat ON garages (show_in_chat);
      CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks (user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events (event);
      CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at);
    `);

    const addColumn = (table: string, column: string, def: string) => {
      try {
        client.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes('duplicate column name')) {
          throw error;
        }
      }
    };

    addColumn('users', 'monthly_limit', 'INTEGER DEFAULT 200');
    addColumn('users', 'marketing_opt_in', 'INTEGER DEFAULT 0 NOT NULL');
    addColumn('users', 'recovery_sms_at', 'INTEGER');
    addColumn('diagnostics', 'year', 'INTEGER');
    addColumn('diagnostics', 'request_id', 'TEXT');
    client.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_diagnostics_request_id ON diagnostics (request_id);');
    addColumn('purchases', 'garage_id', 'INTEGER');
    addColumn('garages', 'subscription_tier', "TEXT DEFAULT 'free' NOT NULL");
    addColumn('garages', 'subscription_expires_at', 'TEXT');
    addColumn('garages', 'city', 'TEXT');
    addColumn('garages', 'owner_user_id', 'INTEGER REFERENCES users(id)');
    addColumn('garages', 'chat_status', "TEXT DEFAULT 'none' NOT NULL");
    addColumn('garages', 'show_in_chat', 'INTEGER DEFAULT 0 NOT NULL');
    addColumn('garages', 'is_verified', 'INTEGER DEFAULT 0 NOT NULL');
    addColumn('garages', 'is_featured', 'INTEGER DEFAULT 0 NOT NULL');

    // Demo garages must be opt-in. A fresh production database should not contain fake businesses.
    if (process.env.SEED_DEMO_DATA === 'true') {
      try {
        const row = client.prepare('SELECT COUNT(*) AS c FROM garages').get() as { c: number };
        if (!row || row.c === 0) {
          const insert = client.prepare(`
            INSERT INTO garages (name, address, phone, lat, lng, rating, reviews_count, specialties, is_open, is_featured, is_verified, is_active, subscription_tier, city, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const seed = [
            ['تعمیرگاه تخصصی موتور پارس', 'تهران، خیابان آزادی', '02188001234', 35.6997, 51.338, 4.6, 128, 'موتور,تنظیم موتور', 1, 1, 1, 1, 'gold', 'تهران', 'تخصص در موتورهای بنزینی و توربو'],
            ['خدمات خودرو آریا', 'تهران، جردن', '02122005678', 35.7575, 51.41, 4.3, 86, 'عمومی,سرویس دوره‌ای', 1, 0, 1, 1, 'free', 'تهران', 'سرویس کامل خودروهای داخلی و خارجی'],
            ['گیربکس و دیفرانسیل تهران', 'تهران، انقلاب', '02166443322', 35.701, 51.391, 4.5, 210, 'گیربکس,دیفرانسیل', 1, 1, 1, 1, 'silver', 'تهران', 'تعمیر تخصصی گیربکس اتومات و دستی'],
            ['برق خودرو مدرن', 'تهران، ونک', '02188887766', 35.757, 51.4105, 4.4, 95, 'برق,ایسیو', 1, 0, 1, 1, 'free', 'تهران', 'عیب‌یابی برق و کامپیوتر خودرو'],
            ['تعمیرگاه جلوبندی و فرمان', 'تهران، شهرری', '02155990011', 35.593, 51.435, 4.1, 54, 'جلوبندی,فرمان', 1, 0, 0, 1, 'free', 'تهران', 'تنظیم فرمان و جلوبندی'],
          ];
          const insertMany = client.transaction((rows: any[][]) => {
            for (const r of rows) insert.run(...r);
          });
          insertMany(seed);
          logger.info('Seeded sample garages (SEED_DEMO_DATA=true).');
        }
      } catch (seedErr) {
        logger.warn('Could not seed demo garages', seedErr);
      }
    }

    logger.info('SQLite database tables verified and ready.', { path: DB_PATH });
  } catch (error) {
    logger.error('Failed to ensure database tables:', error);
    throw error;
  }
}

let tablesReady: Promise<void> | null = null;

export function ensureDbReady(): Promise<void> {
  if (isBuilding) return Promise.resolve();
  if (!tablesReady) tablesReady = ensureTables();
  return tablesReady;
}

export async function pingDb(): Promise<number> {
  const started = Date.now();
  await ensureDbReady();
  getSqlite().prepare('SELECT 1 AS ok').get();
  return Date.now() - started;
}

if (!isBuilding) {
  ensureDbReady()
    .then(() => logger.info('SQLite connected successfully.', { path: DB_PATH }))
    .catch((err) => logger.error('Database init failed:', err instanceof Error ? err.message : err));
}
