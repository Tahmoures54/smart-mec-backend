# مکانیک هوشمند — Backend

سرور Next.js برای اپ فلاتر **مکانیک هوشمند**: ورود OTP، عیب‌یابی با هوش مصنوعی، اشتراک طلایی، پرداخت زیبال، رفرال، و جستجوی تعمیرگاه‌های نزدیک.

زنده: [smart-mec.ir](https://smart-mec.ir) — استقرار ایران: [smart-mec.liara.run](https://smart-mec.liara.run)

## استقرار لیارا (اینماد)

برنامه Next.js روی پلتفرم `docker` لیارا با `liara.json` تنظیم شده است. متغیرهای `.env.example` را در کنسول لیارا وارد کنید، بعد یکی از این دو:

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
|---|---|---|
| POST | `/api/account` | `action=send` / `action=verify` ورود OTP |
| GET | `/api/account/credits` | پروفایل، اعتبار، سهمیه رایگان، رفرال |
| POST | `/api/diagnose` | عیب‌یابی متنی. فیلد اختیاری `previousDiagnosticId` برای سوال پیگیری |
| GET | `/api/diagnose` | تاریخچه عیب‌یابی |
| GET | `/api/diagnose/:id` | جزئیات یک عیب‌یابی (فقط مالک) |
| POST | `/api/diagnose/audio` | عیب‌یابی از صدای موتور |
| POST | `/api/feedback` | امتیاز ۱ تا ۵ به نتیجه |
| POST | `/api/purchase` | ایجاد تراکنش زیبال |
| GET/POST | `/api/purchase/verify` | کال‌بک درگاه — عمومی |
| GET | `/api/products` | کاتالوگ بسته‌ها |
| GET | `/api/cars` | لیست خودروها (`q`, `brand`) |
| GET | `/api/garages` | لیست تعمیرگاه‌های فعال |
| GET | `/api/garages/nearby` | نزدیک‌ترین‌ها با `lat` و `lng` |
| GET | `/api/garages/:id` | جزئیات تعمیرگاه |
| GET | `/api/health` | سلامت سرویس، دیتابیس و وضعیت پیکربندی درگاه |
| GET/POST | `/api/admin` | پنل مدیریت |

هدر `Authorization: Bearer <JWT>` برای مسیرهای محافظت‌شده لازم است.

## درگاه پرداخت — زیبال

مستندات رسمی: [help.zibal.ir/ipg](https://help.zibal.ir/ipg/)

### جریان پرداخت

1. کاربر محصول را انتخاب می‌کند → `POST /api/purchase`
2. سرور سفارش را در دیتابیس به‌صورت `pending` ثبت می‌کند
3. درخواست `POST https://gateway.zibal.ir/v1/request` با `merchant`، مبلغ **ریال**، `callbackUrl`، `orderId` و شماره موبایل ارسال می‌شود
4. زیبال `trackId` برمی‌گرداند و سرور آن را در فیلد `authority` ذخیره می‌کند
5. کاربر به `https://gateway.zibal.ir/start/{trackId}` هدایت می‌شود
6. پس از پرداخت، زیبال به `/api/purchase/verify?trackId=...&success=1&status=2&orderId=sm-{id}` برمی‌گردد
7. سرور با `POST https://gateway.zibal.ir/v1/verify` تراکنش را تأیید می‌کند
8. در صورت `result === 100` یا `201` و تطابق مبلغ، محصول به حساب کاربر اضافه و کمیسیون رفرال پرداخت می‌شود

### متغیرهای محیطی

| متغیر | توضیح | پیش‌فرض |
|---|---|---|
| `ZIBAL_MERCHANT` | کد مرچنت از پنل زیبال (Sandbox: `zibal`) | — |
| `ZIBAL_MERCHANT_ID` | نام قدیمی؛ اگر `ZIBAL_MERCHANT` خالی باشد خوانده می‌شود | — |
| `ZIBAL_REQUEST_URL` | ایجاد درخواست پرداخت | `https://gateway.zibal.ir/v1/request` |
| `ZIBAL_VERIFY_URL` | تأیید پرداخت | `https://gateway.zibal.ir/v1/verify` |
| `ZIBAL_START_URL` | هدایت کاربر به درگاه | `https://gateway.zibal.ir/start` |
| `ZIBAL_TIMEOUT_MS` | مهلت پاسخ درگاه (میلی‌ثانیه) | `15000` |

در **production** اگر مرچنت تنظیم نشده باشد، پرداخت ساختگی ساخته نمی‌شود و API خطا می‌دهد.

برای تست محلی، `ZIBAL_MERCHANT` را خالی بگذارید تا MOCK فعال شود، یا مقدار `zibal` بگذارید تا از Sandbox رسمی زیبال استفاده شود.

### واحد پول

قیمت‌های `PRODUCTS` (در `src/types/index.ts`) به **تومان** ذخیره می‌شوند، اما زیبال فقط **ریال** می‌پذیرد. تبدیل در `src/lib/zibal.ts` با `TOMAN_TO_RIAL = 10` انجام می‌شود. مبلغ ذخیره‌شده در دیتابیس همواره تومان است.

### تنظیمات پنل زیبال

1. از [zibal.ir](https://zibal.ir) → درگاه‌ها / API Tokenها کد مرچنت درگاه «مکانیک هوشمند» را کپی کنید
2. همان مقدار را در لیارا به‌نام `ZIBAL_MERCHANT` بگذارید — نه مقدار تست `zibal`
3. `APP_URL=https://smart-mec.ir` باشد تا کال‌بک به دامنه اصلی برگردد
4. در صورت فعال بودن محدودیت IP روی توکن، IP خروجی سرور لیارا را ثبت کنید
5. متغیر قدیمی `PAYPING_TOKEN` را در لیارا/Vercel حذف کنید

### امنیت پرداخت

- کال‌بک `/api/purchase/verify` عمداً بدون JWT است تا زیبال بتواند کاربر را برگرداند
- تکمیل پرداخت فقط با `result === 100` یا `201` از زیبال، تطابق مبلغ، و تراکنش `pending` انجام می‌شود
- به‌روزرسانی تراکنش در یک `db.transaction` اتمی است تا محصول دو بار داده نشود
- `UNIVERSAL_BYPASS_CODE` فقط برای توسعه است؛ در production خالی بگذارید
- فایل `.env` را commit نکنید
