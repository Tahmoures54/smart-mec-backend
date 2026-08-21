# Smart-MEC Backend

بک‌اند اپلیکیشن **مکانیک هوشمند** — عیب‌یابی خودرو با هوش مصنوعی برای خودروهای ایرانی و مونتاژی.

## Tech Stack

- **Next.js 16** (App Router) — API Routes
- **Drizzle ORM** + **Neon PostgreSQL**
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

## Quick Start

```bash
cp .env.example .env
# مقادیر واقعی را پر کنید

npm install
npm run db:push   # یا db:migrate
npm run dev
```

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
- Rate limit فعلی in-memory است؛ برای multi-instance از Redis استفاده کنید.
- `ADMIN_BYPASS_CODE` و `UNIVERSAL_BYPASS_CODE` فقط برای توسعه/اضطراری.

## Deploy

- Vercel / Liara / هر host سازگار با Next.js
- `DATABASE_URL` باید Neon (یا Postgres سازگار) باشد
- `maxDuration` برای `/api/diagnose` روی ۶۰ ثانیه تنظیم شده

## License

Private — All rights reserved.
