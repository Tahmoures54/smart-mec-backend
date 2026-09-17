import { getSqlite } from '@/db';
import { logger } from '@/utils/logger';

let done = false;

/** ستون‌های مالک تعمیرگاه + وضعیت معرفی در چت */
export async function ensureGarageChatColumns() {
  if (done) return;
  const sqlite = getSqlite();

  try {
    const addColumn = (table: string, column: string, def: string) => {
      try {
        sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
      } catch {
        // ستون از قبل وجود دارد
      }
    };

    addColumn('garages', 'owner_user_id', 'INTEGER');
    addColumn('garages', 'chat_status', "TEXT DEFAULT 'none'");
    addColumn('garages', 'show_in_chat', 'INTEGER DEFAULT 0');
    addColumn('purchases', 'garage_id', 'INTEGER');

    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_garages_owner ON garages (owner_user_id);`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_garages_show_chat ON garages (show_in_chat);`);

    done = true;
  } catch (e) {
    logger.warn('ensureGarageChatColumns', e);
  }
}
