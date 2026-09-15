import { neon } from '@neondatabase/serverless';
import { logger } from '@/utils/logger';

let done = false;

/** ستون‌های مالک تعمیرگاه + وضعیت معرفی در چت */
export async function ensureGarageChatColumns() {
  if (done || !process.env.DATABASE_URL) return;
  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`ALTER TABLE garages ADD COLUMN IF NOT EXISTS owner_user_id INTEGER`;
    await sql`ALTER TABLE garages ADD COLUMN IF NOT EXISTS chat_status TEXT DEFAULT 'none'`;
    await sql`ALTER TABLE garages ADD COLUMN IF NOT EXISTS show_in_chat BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS garage_id INTEGER`;
    await sql`CREATE INDEX IF NOT EXISTS idx_garages_owner ON garages (owner_user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_garages_show_chat ON garages (show_in_chat)`;
    done = true;
  } catch (e) {
    logger.warn('ensureGarageChatColumns', e);
  }
}
