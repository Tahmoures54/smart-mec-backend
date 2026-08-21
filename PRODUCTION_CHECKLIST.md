# ✅ چک‌لیست انتشار نهایی — Smart-MEC Backend

قبل از باز کردن اپ برای کاربران واقعی، همه موارد زیر را تیک بزن.

## ۱. امنیت (بحرانی)

- [ ] فایل `.env` از ریپو حذف شده و **همه secrets rotate** شده‌اند:
  - `JWT_SECRET` (حداقل ۳۲ کاراکتر تصادفی)
  - `ADMIN_SYSTEM_TOKEN`
  - `ADMIN_BYPASS_CODE` / `UNIVERSAL_BYPASS_CODE`
  - `KAVENEGAR_API_KEY`
  - `DEEPSEEK_API_KEY`
  - `PAYPING_TOKEN`
  - `DATABASE_URL`
- [ ] در production مقدار `UNIVERSAL_BYPASS_CODE` خالی باشد
- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS` فقط دامنه‌های واقعی اپ (بدون `*`)

## ۲. زیرساخت

- [ ] Neon PostgreSQL آماده + `DATABASE_URL` ست شده
- [ ] Upstash Redis برای rate limit:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- [ ] کاوه‌نگار: قالب `verify` فعال و حساب تأییدشده
- [ ] پی‌پینگ: درگاه production (نه MOCK)
- [ ] DeepSeek API key با اعتبار کافی

## ۳. استقرار

```bash
npm install
npm run typecheck
npm run build
# deploy به Vercel / Liara
```

- [ ] `/api/health` وضعیت `ok` و `database: up` برمی‌گرداند
- [ ] OTP واقعی روی شماره تست ارسال می‌شود
- [ ] یک خرید تستی end-to-end انجام شده
- [ ] یک عیب‌یابی کامل با کسر اعتبار کار می‌کند

## ۴. جذب کاربر و داده واقعی

### فرانت (Flutter) باید این endpointها را صدا بزند:

| رویداد | Endpoint |
|--------|----------|
| لیست خودرو | `GET /api/cars` |
| محصولات | `GET /api/products` |
| آنالیتیکس | `POST /api/events` با `eventName` |
| بازخورد عیب‌یابی | `POST /api/feedback` با `diagnosticId` + `rating` (1–5) |

### رویدادهای پیشنهادی برای ارسال از اپ:

`app_open`, `app_install`, `login_success`, `diagnose_start`, `diagnose_success`, `purchase_start`, `purchase_success`, `referral_share`, `credit_low`, `golden_view`

### داشبورد ادمین:

`GET /api/admin?section=dashboard` → کاربران جدید ۷روز، درآمد، امتیاز میانگین، top cars، events

`GET /api/admin?section=feedback` → نظرات کاربران روی AI

## ۵. رشد اولیه (پیشنهاد عملی)

1. **۲ عیب‌یابی رایگان/ماه** را در تبلیغات برجسته کن
2. کد رفرال را بعد از اولین عیب‌یابی موفق پیشنهاد بده
3. از واتساپ/تلگرام مکانیک‌ها و گروه‌های خودرو برای seed اولیه استفاده کن
4. هر هفته `avgRating` و `topCars` را در ادمین چک کن و پرامپت AI را بهبود بده
5. اگر `diagnose_error` زیاد شد → timeout یا کلید AI را بررسی کن

## ۶. مانیتورینگ بعد از لانچ

- هر روز: `/api/health`
- هر هفته: dashboard ادمین (newUsers7d, revenue7d, avgRating)
- لاگ‌های Vercel/Liara برای 5xx

---

**یادآوری:** بدون Upstash و بدون rotate کردن secrets، لانچ نکن.
