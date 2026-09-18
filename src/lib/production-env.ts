import { getZibalMerchant } from '@/lib/zibal';

export type ProductionCheck = {
  key: string;
  ok: boolean;
  required: boolean;
  message: string;
};

export function validateProductionEnvironment(): ProductionCheck[] {
  const production = process.env.NODE_ENV === 'production';
  if (!production) return [];

  const jwt = process.env.JWT_SECRET?.trim() || '';
  const appUrl = process.env.APP_URL?.trim() || '';
  const checks: ProductionCheck[] = [
    {
      key: 'JWT_SECRET',
      ok: jwt.length >= 32,
      required: true,
      message: jwt.length >= 32 ? 'configured' : 'must be at least 32 characters',
    },
    {
      key: 'APP_URL',
      ok: /^https:\/\//i.test(appUrl),
      required: true,
      message: /^https:\/\//i.test(appUrl) ? 'configured' : 'must use https://',
    },
    {
      key: 'DEEPSEEK_API_KEY',
      ok: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
      required: true,
      message: process.env.DEEPSEEK_API_KEY?.trim() ? 'configured' : 'missing',
    },
    {
      key: 'ZIBAL_MERCHANT',
      ok: Boolean(getZibalMerchant()),
      required: true,
      message: getZibalMerchant() ? 'configured' : 'missing',
    },
    {
      key: 'ADMIN_PHONE',
      ok: Boolean(process.env.ADMIN_PHONE?.trim()),
      required: true,
      message: process.env.ADMIN_PHONE?.trim() ? 'configured' : 'missing',
    },
    {
      key: 'ADMIN_SYSTEM_TOKEN',
      ok: Boolean(process.env.ADMIN_SYSTEM_TOKEN?.trim()),
      required: false,
      message: process.env.ADMIN_SYSTEM_TOKEN?.trim() ? 'configured' : 'not configured (OTP admin auth remains available)',
    },
    {
      key: 'SEED_DEMO_DATA',
      ok: process.env.SEED_DEMO_DATA !== 'true',
      required: true,
      message: process.env.SEED_DEMO_DATA === 'true' ? 'must be disabled in production' : 'disabled',
    },
  ];

  return checks;
}

export function productionEnvironmentHealthy(): boolean {
  return validateProductionEnvironment()
    .filter((check) => check.required)
    .every((check) => check.ok);
}
