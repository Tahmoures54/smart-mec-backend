// ═══════════════════════════════════════════════════════════
// SMS Service (Kavenegar) - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { randomInt } from 'node:crypto';
import { logger } from '@/utils/logger';

export class SMSService {
  private static apiKey = process.env.KAVENEGAR_API_KEY;
  private static template = process.env.KAVENEGAR_TEMPLATE || 'verify';

  static isDevOtpVisible(): boolean {
    return process.env.SHOW_OTP_IN_DEV === 'true' && process.env.NODE_ENV !== 'production';
  }

  static async sendOTP(phone: string, code: string): Promise<boolean> {
    if (!this.apiKey) {
      if (this.isDevOtpVisible() || process.env.NODE_ENV !== 'production') {
        logger.warn(`[DEV OTP] ${phone.slice(0, 4)}**** → ${code}`);
        return true;
      }
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
        logger.info(`OTP sent successfully to ${phone.slice(0, 4)}****`);
        return true;
      }

      logger.error('Kavenegar Error', data.return);
      return false;
    } catch (error) {
      logger.error('Failed to send SMS via Kavenegar', error);
      return false;
    }
  }

  /** Secure 6-digit OTP generation. */
  static generateOTP(): string {
    return randomInt(100000, 1000000).toString();
  }
}
