// ═══════════════════════════════════════════════════════════
// Database Connection - Smart-MEC
// Neon PostgreSQL (Vercel-compatible)
// ═══════════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { logger } from '@/utils/logger';

// در زمان بیلد، ورسل متغیرها را تزریق نمی‌کند. 
// برای جلوگیری از کرش کردن بیلد، اگر متغیر نبود، یک استرینگ خالی می‌دهیم.
const databaseUrl = process.env.DATABASE_URL || '';

// ایجاد کلاینت Neon
const sql = neon(databaseUrl);

// اتصال Drizzle به Neon
export const db = drizzle(sql, { schema });

async function ensureTables() {
  try {
    // بررسی وجود متغیر محیطی در زمان اجرا
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing');
    }

    // ساخت جدول کاربران
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

    // ساخت جدول استفاده اکانت طلایی
    await sql`
      CREATE TABLE IF NOT EXISTS golden_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        year_month TEXT NOT NULL,
        count INTEGER DEFAULT 0 NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // ساخت جدول رمزهای یکبار مصرف (OTP)
    await sql`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        is_used BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // ساخت جدول عیب‌یابی‌ها
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

    // ساخت جدول خریدها
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

    // ساخت جدول درخواست برداشت
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

    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 200;`;
    } catch {
      // ستون از قبل وجود دارد
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
  // ارور اصلی را اینجا در زمان اجرا پرتاب می‌کنیم تا ورسل بیلد را متوقف نکند
  if (!process.env.DATABASE_URL && !isBuilding) {
    throw new Error('❌ DATABASE_URL is not set in environment variables');
  }
  
  if (isBuilding) return Promise.resolve();
  
  if (!tablesReady) {
    tablesReady = ensureTables();
  }
  return tablesReady;
}

// در سرور واقعی جدول‌ها را بساز
if (!isBuilding) {
  ensureDbReady().then(() => {
    logger.info('✅ Neon PostgreSQL connected successfully.');
  }).catch((err) => {
    logger.error('❌ Database connection failed:', err.message);
  });
}
