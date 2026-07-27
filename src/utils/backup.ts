// ═══════════════════════════════════════════════════════════
// Database Backup Utility - Smart-MEC
// ═══════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export class BackupManager {
  private static dbUrl = process.env.DATABASE_URL || 'file:./app.db';
  private static dbPath = BackupManager.dbUrl.replace('file:', '');
  private static backupDir = path.join(path.dirname(BackupManager.dbPath), 'backups');
  private static MAX_BACKUPS = 7; // نگهداری بکاپ‌های 7 روز گذشته

  /**
   * ایجاد فایل پشتیبان از دیتابیس SQLite
   */
  static async createBackup(): Promise<boolean> {
    try {
      // بررسی وجود فایل اصلی دیتابیس
      if (!fs.existsSync(this.dbPath)) {
        logger.warn('⚠️ No database file found to backup.');
        return false;
      }

      // ایجاد پوشه بکاپ اگر وجود نداشت
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      // ایجاد نام فایل با تاریخ (مثال: app-2023-10-25.db.bak)
      const date = new Date().toISOString().split('T')[0];
      const backupFile = path.join(this.backupDir, `app-${date}.db.bak`);

      // کپی فایل
      fs.copyFileSync(this.dbPath, backupFile);
      logger.info(`✅ Database backup created successfully: ${backupFile}`);

      // پاکسازی بکاپ‌های قدیمی
      this.cleanOldBackups();

      return true;
    } catch (error) {
      logger.error('❌ Failed to create database backup', error);
      return false;
    }
  }

  /**
   * حذف بکاپ‌های قدیمی‌تر از حد مجاز
   */
  private static cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.db.bak'))
        .map(file => ({
          name: file,
          time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // مرتب‌سازی نزولی (جدیدترین در ابتدا)

      // حذف فایل‌های اضافی
      if (files.length > this.MAX_BACKUPS) {
        const filesToDelete = files.slice(this.MAX_BACKUPS);
        for (const file of filesToDelete) {
          fs.unlinkSync(path.join(this.backupDir, file.name));
          logger.info(`🗑️ Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      logger.error('❌ Failed to clean old backups', error);
    }
  }
}