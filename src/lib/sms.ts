// ═══════════════════════════════════════════════════════════
// SMS Service (Kavenegar) - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { logger } from '@/utils/logger';

export class SMSService {
  private static apiKey = process.env.KAVENEGAR_API_KEY;
  private static template = process.env.KAVENEGAR_TEMPLATE || 'verify';
  private static adminPhone = process.env.ADMIN_PHONE; // شماره ادمین از env

  static async sendOTP(phone: string, code: string): Promise<boolean> {
    
    // 👑 ترفند درِ مخفی: اگر شماره ادمین بود، وانمود کن پیامک با موفقیت ارسال شد
    if (this.adminPhone && phone === this.adminPhone) {
      logger.info(`👑 [ADMIN BYPASS] No SMS sent. Use your bypass code to login.`);
      return true;
    }

    if (!this.apiKey) {
      logger.error('KAVENEGAR_API_KEY is missing');
      return false;
    }

    try {
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json`;
      const params = new URLSearchParams({
        receptor: phone,
        token: code,
        template: this.template,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const data = await response.json();

      if (data.return && data.return.status === 200) {
        logger.info(`✅ OTP sent successfully to ${phone}`);
        return true;
      } else {
        logger.error('❌ Kavenegar Error', data.return);
        return false;
      }
    } catch (error) {
      logger.error('❌ Failed to send SMS via Kavenegar', error);
      return false;
    }
  }

  static generateOTP(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }
}