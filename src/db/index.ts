// ═══════════════════════════════════════════════════════════
// Database Connection - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';
import { logger } from '@/utils/logger';

const rawDbUrl = (process.env.DATABASE_URL || 'file:./app.db').replace(/['"]/g, '');
const dbPath = rawDbUrl.replace('file:', '');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`📁 Database directory created at ${dbDir}`);
  } catch (error) {
    logger.error(`❌ Failed to create database directory at ${dbDir}`, error);
  }
}

// 👈 اضافه کردن timeout: اگر دیتابیس شلوغ بود، 5 ثانیه صبر کن به جای ارور دادن
const sqlite = new Database(dbPath, { timeout: 5000 });

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle(sqlite, { schema });

function ensureTables() {
  try {
    sqlite.exec(`
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
    `);
    
    // اگر فایل دیتابیس قدیمی بود و ستون monthly_limit را نداشت، آن را به زور اضافه کن
    try {
      sqlite.exec(`ALTER TABLE users ADD COLUMN monthly_limit INTEGER DEFAULT 200;`);
      logger.info('✅ Column monthly_limit added to users table.');
    } catch (e) {
      // این خطا یعنی ستون از قبل وجود دارد، پس جای نگرانی نیست
    }

    logger.info('✅ Database tables verified and ready.');
  } catch (error) {
    logger.error('❌ Failed to ensure database tables:', error);
  }
}

// 🚀 تشخیص اینکه آیا الان Next.js در حال Build گرفتن است یا سرور واقعاً روشن شده است؟
const isBuilding = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build';

// فقط در صورتی که سرور در حال کار واقعی است (نه موقع بیلد) جدول‌ها را بساز
if (!isBuilding) {
  ensureTables();
  logger.info('✅ SQLite Database connected with WAL mode enabled.');
}