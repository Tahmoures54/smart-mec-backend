# Smart-MEC Backend

بک‌اند اپلیکیشن **مکانیک هوشمند** — عیب‌یابی خودرو با هوش مصنوعی برای خودروهای ایرانی و مونتاژی.

## Tech Stack

- **Next.js 16** (App Router) — API Routes
- **Drizzle ORM** + **Neon PostgreSQL**
- **Upstash Redis** — Rate limiting (distributed)
- **JWT** (jose) برای احراز هویت
- **Kavenegar** برای OTP
- **PayPing** برای پرداخت
- **DeepSeek** برای تحلیل عیب‌یابی

## Features

| قابلیت | توضیح |
|--------|--------|
| OTP Login | ورود با شماره موبایل + کد پیامکی |
| AI Diagnose | عیب‌یابی با پرامپت فارسی تخصصی |
| Credits | اعتبار خریداری‌شده برای عیب‌یابی |
| Golden Sub | اشتراک ماهانه/سه‌ماهه/سالانه با سقف ماهانه |
| Free Quota | ۲ عیب‌یابی رایگان در ماه |
| Referral | کد دعوت + پاداش اعتبار + کمیسیون فروش |
| Withdraw | درخواست برداشت درآمد رفرال |
| Admin Panel | داشبورد، کاربران، برداشت‌ها، خریدها |
| Rate Limit | Upstash Redis (با fallback حافظه محلی) |

## Quick Start

```bash
cp .env.example .env
# مقادیر واقعی را پر کنید (DATABASE_URL، JWT_SECRET، ...)

npm install
npm run db:push   # یا db:migrate
npm run dev
```

### Rate Limiter (Upstash)

1. در [console.upstash.com](https://console.upstash.com) یک Redis بسازید.
2. از بخش **REST API** مقادیر زیر را کپی کنید:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. در `.env` قرار دهید.

اگر این دو متغیر خالی باشند، سیستم به‌صورت خودکار از **in-memory** استفاده می‌کند (فقط مناسب local).

## API Overview

| Method | Path | Auth | توضیح |
|--------|------|------|--------|
| POST | `/api/account` | — | `action=send` / `action=verify` |
| GET | `/api/account/credits` | ✅ | پروفایل + اعتبار + رفرال |
| POST | `/api/account/withdraw` | ✅ | درخواست برداشت |
| GET | `/api/account/withdraw` | ✅ | لیست درخواست‌ها |
| POST | `/api/diagnose` | ✅ | عیب‌یابی AI |
| GET | `/api/diagnose?history=true` | ✅ | تاریخچه |
| POST | `/api/purchase` | ✅ | ایجاد پرداخت |
| GET | `/api/purchase/verify` | — | بازگشت از درگاه |
| GET | `/api/products` | — | لیست محصولات |
| GET | `/api/health` | — | سلامت سرویس + DB |
| GET/POST | `/api/admin` | Admin | پنل مدیریت |

## Security Notes

- **هرگز** فایل `.env` را commit نکنید.
- اگر قبلاً `.env` در تاریخچه گیت بوده، secrets را rotate کنید.
- در production حتماً Upstash Redis را فعال کنید تا rate limit بین instanceها مشترک باشد.
- `ADMIN_BYPASS_CODE` و `UNIVERSAL_BYPASS_CODE` فقط برای توسعه/اضطراری.

## Deploy

- Vercel / Liara / هر host سازگار با Next.js
- `DATABASE_URL` باید Neon (یا Postgres سازگار) باشد
- `UPSTASH_REDIS_REST_URL` و `UPSTASH_REDIS_REST_TOKEN` برای rate limit
- `maxDuration` برای `/api/diagnose` روی ۶۰ ثانیه تنظیم شده

## License

Private — All rights reserved.
