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

    await sql`
      CREATE TABLE IF NOT EXISTS garages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        rating DOUBLE PRECISION,
        reviews_count INTEGER DEFAULT 0,
        specialties TEXT,
        photo_url TEXT,
        website TEXT,
        description TEXT,
        is_open BOOLEAN DEFAULT true,
        is_featured BOOLEAN DEFAULT false NOT NULL,
        is_verified BOOLEAN DEFAULT false NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        subscription_tier TEXT DEFAULT 'free' NOT NULL,
        subscription_expires_at TEXT,
        city TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_garages_lat_lng ON garages (lat, lng);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_garages_active ON garages (is_active);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_garages_featured ON garages (is_featured);`;

    try {
      const countResult = await sql`SELECT COUNT(*)::int AS c FROM garages;`;
      const count = Number((countResult as any)?.[0]?.c ?? 0);
      if (count === 0) {
        await sql`
          INSERT INTO garages (name, address, phone, lat, lng, rating, reviews_count, specialties, is_open, is_featured, is_verified, is_active, subscription_tier, city, description)
          VALUES
            ('تعمیرگاه تخصصی موتور پارس', 'تهران، خیابان آزادی', '02188001234', 35.6997, 51.3380, 4.6, 128, 'موتور,تنظیم موتور', true, true, true, true, 'gold', 'تهران', 'تخصص در موتورهای بنزینی و توربو'),
            ('خدمات خودرو آریا', 'تهران، جردن', '02122005678', 35.7575, 51.4100, 4.3, 86, 'عمومی,سرویس دوره‌ای', true, false, true, true, 'free', 'تهران', 'سرویس کامل خودروهای داخلی و خارجی'),
            ('گیربکس و دیفرانسیل تهران', 'تهران، انقلاب', '02166443322', 35.7010, 51.3910, 4.5, 210, 'گیربکس,دیفرانسیل', true, true, true, true, 'silver', 'تهران', 'تعمیر تخصصی گیربکس اتومات و دستی'),
            ('برق خودرو مدرن', 'تهران، ونک', '02188887766', 35.7570, 51.4105, 4.4, 95, 'برق,ایسیو', true, false, true, true, 'free', 'تهران', 'عیب‌یابی برق و کامپیوتر خودرو'),
            ('تعمیرگاه جلوبندی و فرمان', 'تهران، شهرری', '02155990011', 35.5930, 51.4350, 4.1, 54, 'جلوبندی,فرمان', true, false, false, true, 'free', 'تهران', 'تنظیم فرمان و جلوبندی')
        `;
        logger.info('✅ Seeded sample garages (Tehran).');
      }
    } catch (seedErr) {
      logger.warn('Could not seed garages', seedErr);
    }

    try {
      await sql`ALTER TABLE otps ALTER COLUMN expires_at TYPE BIGINT;`;
    } catch (alterError) {
      logger.warn('Could not alter otps.expires_at type (maybe already BIGINT)', alterError);
    }

    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 200;`;
    } catch {
      // column already exists
    }

    try {
      await sql`ALTER TABLE garages ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' NOT NULL;`;
      await sql`ALTER TABLE garages ADD COLUMN IF NOT EXISTS subscription_expires_at TEXT;`;
    } catch (e) {
      logger.warn('Could not add subscription columns to garages', e);
    }

    logger.info('✅ Database tables verified and ready.');
  } catch (error) {
    logger.error('❌ Failed to ensure database tables:', error);
    throw error;
  }
}

let tablesReady: Promise<void> | null = null;

export function ensureDbReady(): Promise<void> {
  if (isBuilding) {
    return Promise.resolve();
  }
  if (!process.env.DATABASE_URL) {
    return Promise.reject(new Error('❌ DATABASE_URL is not set in environment variables'));
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
