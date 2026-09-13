# مکانیک هوشمند — Backend

سرور Next.js برای اپ فلاتر **مکانیک هوشمند**: ورود OTP، عیب‌یابی با هوش مصنوعی، اشتراک طلایی، پرداخت PayPing، رفرال، و جستجوی تعمیرگاه‌های نزدیک.

زنده: [smart-mec.ir](https://smart-mec.ir) — استقرار ایران: [smart-mec.liara.run](https://smart-mec.liara.run)

## استقرار لیارا (اینماد)

برنامه Next.js روی پلتفرم `next` لیارا با `liara.json` تنظیم شده است. متغیرهای `.env.example` را در کنسول لیارا وارد کنید، بعد یکی از این دو:

- کنسول لیارا → استقرار جدید (GitHub یا آپلود)
- یا در GitHub یک Secret به نام `LIARA_API_TOKEN` بگذارید تا workflow `CD-Liara` (`.github/workflows/liara.yaml`) روی `main` دیپلوی کند

دامنه `smart-mec.ir` را در لیارا → دامنه‌ها اضافه کنید. ابر آروان را برای `@` و `www` **خاموش** کنید و رکوردهایی که لیارا می‌دهد (ALIAS/CNAME و TXT) را جایگزین A فعلی Vercel کنید. اینماد دامنه `.liara.run` را قبول نمی‌کند؛ باید روی `smart-mec.ir` باشد.

## اجرای محلی

```bash
cp .env.example .env
npm install
npm run dev
```

برای ورود بدون کاوه‌نگار، `SHOW_OTP_IN_DEV=true` بگذارید تا کد OTP در پاسخ `/api/account` برگردد.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## API

همه مسیرها علاوه بر `/api/...` از `/api/v1/...` هم در دسترس‌اند.

| روش | مسیر | توضیح |
| --- | --- | --- |
| POST | `/api/account` | `action=send` / `action=verify` ورود OTP |
| GET | `/api/account/credits` | پروفایل، اعتبار، سهمیه رایگان، رفرال |
| POST | `/api/diagnose` | عیب‌یابی متنی. فیلد اختیاری `previousDiagnosticId` برای سوال پیگیری |
| GET | `/api/diagnose` | تاریخچه عیب‌یابی |
| GET | `/api/diagnose/:id` | جزئیات یک عیب‌یابی (فقط مالک) |
| POST | `/api/diagnose/audio` | عیب‌یابی از صدای موتور |
| POST | `/api/feedback` | امتیاز ۱ تا ۵ به نتیجه |
| POST | `/api/purchase` | ایجاد تراکنش |
| GET | `/api/purchase/verify` | کال‌بک درگاه — **عمومی** |
| GET | `/api/products` | کاتالوگ بسته‌ها |
| GET | `/api/cars` | لیست خودروها (`q`, `brand`) |
| GET | `/api/garages` | لیست تعمیرگاه‌های فعال |
| GET | `/api/garages/nearby` | نزدیک‌ترین‌ها با `lat` و `lng` |
| GET | `/api/garages/:id` | جزئیات تعمیرگاه |
| GET | `/api/health` | سلامت سرویس و دیتابیس |
| GET/POST | `/api/admin` | پنل مدیریت |

هدر `Authorization: Bearer <JWT>` برای مسیرهای محافظت‌شده لازم است.

## امنیت عملیاتی

- فایل `.env` را commit نکنید. اگر قبلاً در تاریخچه گیت بوده، secretها را rotate کنید.
- `UNIVERSAL_BYPASS_CODE` فقط برای محیط توسعه؛ در production خالی بگذارید.
- کال‌بک PayPing عمداً بدون JWT است؛ تکمیل پرداخت فقط با `status=pending` و تأیید درگاه انجام می‌شود.
