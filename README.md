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
| Analytics | رویدادهای محصول (`/api/events`) |
| Feedback | امتیاز ۱–۵ روی نتیجه عیب‌یابی |
| Admin Panel | داشبورد رشد، کاربران، برداشت‌ها، بازخورد |

## Quick Start

```bash
cp .env.example .env
# مقادیر واقعی را پر کنید

npm install
npm run db:push   # یا اولین deploy — ensureTables خودش می‌سازد
npm run dev
```

قبل از لانچ حتماً [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) را کامل کنید.

### Rate Limiter (Upstash)

1. [console.upstash.com](https://console.upstash.com) → Redis
2. REST API:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

بدون این دو، fallback به حافظه محلی است (فقط local).

## API Overview

| Method | Path | Auth | توضیح |
|--------|------|------|--------|
| POST | `/api/account` | — | `action=send` / `action=verify` |
| GET | `/api/account/credits` | ✅ | پروفایل + اعتبار + رفرال |
| POST | `/api/account/withdraw` | ✅ | درخواست برداشت |
| GET | `/api/account/withdraw` | ✅ | لیست درخواست‌ها |
| POST | `/api/diagnose` | ✅ | عیب‌یابی AI |
| GET | `/api/diagnose?history=true` | ✅ | تاریخچه |
| POST | `/api/feedback` | ✅ | امتیاز + نظر روی عیب‌یابی |
| POST | `/api/events` | اختیاری | آنالیتیکس محصول |
| GET | `/api/cars` | — | لیست خودروها |
| GET | `/api/products` | — | لیست محصولات |
| POST | `/api/purchase` | ✅ | ایجاد پرداخت |
| GET | `/api/purchase/verify` | — | بازگشت از درگاه |
| GET | `/api/health` | — | سلامت سرویس + DB |
| GET/POST | `/api/admin` | Admin | پنل مدیریت |

نسخه ` /api/v1/* ` هم از طریق rewrite پشتیبانی می‌شود.

## Security Notes

- **هرگز** فایل `.env` را commit نکنید.
- اگر قبلاً secrets در گیت بوده، **همه را rotate** کنید.
- در production، bypassهای OTP فقط با `ALLOW_AUTH_BYPASS=true` فعال می‌شوند.
- Upstash Redis را در production فعال کنید.

## Deploy

- Vercel (region `fra1`) / Liara
- `maxDuration` برای diagnose = ۶۰ ثانیه
- envهای ضروری: `DATABASE_URL`, `JWT_SECRET`, `KAVENEGAR_*`, `DEEPSEEK_*`, `PAYPING_TOKEN`, `UPSTASH_*`

## License

Private — All rights reserved.
