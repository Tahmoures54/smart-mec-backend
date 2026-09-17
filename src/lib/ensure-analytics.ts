import { neon } from '@neondatabase/serverless';
import { logger } from '@/utils/logger';

let done = false;

export async function ensureAnalyticsTables() {
  if (done || !process.env.DATABASE_URL) return;
  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        event TEXT NOT NULL,
        session_id TEXT,
        user_id INTEGER,
        path TEXT,
        props JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events (event)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_sms_at TIMESTAMPTZ`;
    done = true;
  } catch (e) {
    logger.warn('ensureAnalyticsTables', e);
  }
}
