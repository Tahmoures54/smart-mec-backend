/**
 * Smart diagnosis prompts + response contract.
 *
 * این فایل دو مسئولیت دارد که هرگز نباید از هم جدا بیفتند:
 *  1) پرامپت‌های فارسی که به مدل زبانی داده می‌شود (SYSTEM_PROMPT_*).
 *  2) قرارداد TypeScript/Zod که اپ برای اعتماد به خروجی JSON مدل استفاده می‌کند
 *     (DiagnosisResponseSchema + parseDiagnosisResponse).
 *
 * وقتی شکل JSON را تغییر می‌دهی، فقط در یک‌جا تغییرش بده (buildJsonSchema +
 * DiagnosisResponseSchema) تا پرامپت و اعتبارسنج هرگز از هم عقب نیفتند.
 */

import { z } from 'zod';

/* ============================================================================
 * 1) ثابت‌های قابل‌تنظیم — منبع واحد برای هر عددی که در قوانین متنی می‌آید.
 *    تغییر را اینجا بده، نه داخل متن فارسی پراکنده.
 * ========================================================================= */

export const PROMPT_VERSION = 3;

export const RULES_CONFIG = {
  maxQuestionsPerRound: 6,
  maxFollowUpRounds: 2,
  maxCauses: 3,
  maxAudioQuestions: 3,
} as const;

/* ============================================================================
 * 2) قرارداد خروجی (Zod) — این چیزیه که واقعاً از رسیدن یک پاسخ خراب/توهمی
 *    به کاربر جلوگیری می‌کند. هر پاسخ مدل باید از parseDiagnosisResponse
 *    عبور کند؛ هرگز مستقیم JSON.parse نکن.
 * ========================================================================= */

const probabilityLevel = z.enum(['high', 'medium', 'low']);
const costBand = z.enum(['low', 'medium', 'high']);

const causeSchema = z.object({
  title: z.string().min(1),
  probability: probabilityLevel,
  why: z.string().min(1),
  costBand,
  costEstimate: z.string().nullable(),
  diyCheck: z.string().nullable(),
});

export const DiagnosisResponseSchema = z.object({
  responseMode: z.enum(['questions', 'diagnosis']),
  followUpRound: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  missingInfo: z.array(z.string()),
  followUpQuestions: z.array(z.string()).max(RULES_CONFIG.maxQuestionsPerRound),
  questionOptions: z.array(z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(6),
  })).max(RULES_CONFIG.maxQuestionsPerRound),
  urgency: z.enum(['green', 'yellow', 'red']),
  confidence: z.enum(['high', 'medium', 'low']),
  safeToDrive: z.boolean().nullable(),
  evidence: z.array(z.string()),
  statusSummary: z.string().min(1),
  causes: z.array(causeSchema).max(RULES_CONFIG.maxCauses),
  mechanicQuestions: z.array(z.string()),
  warnings: z.array(z.string()),
  nextStep: z.string().min(1),
  footer: z.string(),
});

export type DiagnosisResponse = z.infer<typeof DiagnosisResponseSchema>;
export type ResponseMode = DiagnosisResponse['responseMode'];
export type Urgency = DiagnosisResponse['urgency'];
export type Confidence = DiagnosisResponse['confidence'];
export type Cause = DiagnosisResponse['causes'][number];

/* ============================================================================
 * 3) دیوار دوم ایمنی (Defense in depth) — مستقل از رفتار مدل.
 *    حتی اگر مدل قانون ۱۰ را فراموش کند، این لیست کلیدواژه یک شبکهٔ ایمنی
 *    اضافه است که قبل از نمایش پاسخ به کاربر، ناسازگاری خطرناک را می‌گیرد.
 * ========================================================================= */

const DANGER_KEYWORDS = [
  'دود غلیظ',
  'بوی سوختگی',
  'بوی گازوئیل',
  'آتش',
  'شعله',
  'جرقه',
  'ترمز نمی‌گیره',
  'ترمز نگرفت',
  'ترمز نمیگیره',
  'پدال ترمز خالی',
  'فرمان قفل',
  'فرمان سفت شد',
  'فرمان گیر کرد',
  'صدای برخورد فلز',
  'دود از موتور',
  'دود از کاپوت',
] as const;

export function containsDangerSignal(text: string): boolean {
  const normalized = text.toLowerCase();
  return DANGER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/* ============================================================================
 * 4) اعتبارسنجی قواعد بین‌فیلدی — چیزهایی که shape ساده Zod نمی‌تواند بگیرد.
 * ========================================================================= */

export function validateDiagnosisInvariants(
  res: DiagnosisResponse,
  context?: { userMessage?: string },
): string[] {
  const problems: string[] = [];

  if (res.responseMode === 'questions') {
    if (res.causes.length > 0) problems.push('causes باید در حالت questions خالی باشد');
    if (res.mechanicQuestions.length > 0)
      problems.push('mechanicQuestions باید در حالت questions خالی باشد');
    if (res.followUpQuestions.length === 0)
      problems.push('followUpQuestions در حالت questions نباید خالی باشد');
    if (res.questionOptions.length !== res.followUpQuestions.length)
      problems.push('questionOptions باید برای همه followUpQuestions گزینه داشته باشد');
    if (res.questionOptions.some((q) => q.options.length < 2))
      problems.push('هر questionOptions باید حداقل دو گزینه داشته باشد');
  }

  if (res.responseMode === 'diagnosis') {
    if (res.followUpQuestions.length > 0)
      problems.push('followUpQuestions باید در حالت diagnosis خالی باشد');
    if (res.missingInfo.length > 0)
      problems.push('missingInfo باید در حالت diagnosis خالی باشد');
    if (res.causes.length === 0) problems.push('حالت diagnosis باید حداقل یک cause داشته باشد');
  }

  if (res.urgency === 'red' && res.safeToDrive !== false) {
    problems.push('وقتی urgency=red است safeToDrive باید false باشد');
  }

  // شبکهٔ ایمنی دوم: اگر کاربر خودش نشانهٔ خطر فوری گفته ولی مدل آن را
  // urgency=red نکرده، این پاسخ را رد کن تا لایهٔ بالاتر fallback ایمن بدهد.
  if (context?.userMessage && containsDangerSignal(context.userMessage) && res.urgency !== 'red') {
    problems.push('متن کاربر نشانهٔ خطر فوری دارد ولی urgency=red نیست');
  }

  return problems;
}

/* ============================================================================
 * 5) پارس امن + fallback — هرگز نگذار خروجی خام مدل بدون گارد به UI برسد.
 * ========================================================================= */

export class DiagnosisResponseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message);
    this.name = 'DiagnosisResponseError';
  }
}

export function parseDiagnosisResponse(
  raw: string,
  context?: { userMessage?: string },
): DiagnosisResponse {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new DiagnosisResponseError('پاسخ مدل JSON معتبر نبود', raw);
  }

  const result = DiagnosisResponseSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new DiagnosisResponseError(
      `پاسخ مدل با قرارداد خروجی همخوانی نداشت: ${result.error.message}`,
      raw,
    );
  }

  const problems = validateDiagnosisInvariants(result.data, context);
  if (problems.length > 0) {
    throw new DiagnosisResponseError(problems.join(' | '), raw);
  }

  return result.data;
}

/**
 * وقتی پارس/اعتبارسنجی شکست بخورد (یا danger-keyword در متن کاربر باشد و
 * مطمئن نیستیم مدل جدی گرفته)، این پاسخ محافظه‌کارانه را به‌جای کرش یا
 * نمایش خروجی خام مدل نشان بده.
 */
export function buildSafeFallbackResponse(reason: string): DiagnosisResponse {
  return {
    responseMode: 'diagnosis',
    followUpRound: 0,
    missingInfo: [],
    followUpQuestions: [],
    questionOptions: [],
    urgency: 'yellow',
    confidence: 'low',
    safeToDrive: null,
    evidence: [],
    statusSummary: 'به دلیل یک خطای فنی، نتوانستیم تحلیل دقیقی ارائه کنیم.',
    causes: [],
    mechanicQuestions: [],
    warnings: [
      'اگر علامتی مثل دود غلیظ، بوی سوختگی شدید یا صدای برخورد فلزی دارید، رانندگی نکنید.',
    ],
    nextStep: 'لطفاً دوباره شرح مشکل را کامل‌تر ارسال کنید یا با یک مکانیک نزدیک مشورت کنید.',
    footer: '',
  };
  // reason صرفاً برای لاگ‌گیری سمت سرور است؛ در پاسخ به کاربر منعکس نمی‌شود.
  void reason;
}

/* ============================================================================
 * 6) پرامپت‌ها — از همان بلوک‌های مشترک ساخته می‌شوند تا لحن/schema/قوانین
 *    ایمنی هرگز بین tierها از هم جدا نیفتند.
 * ========================================================================= */

const SHARED_RULES = `
هویت: تو «مکانیک هوشمند» هستی؛ کاربر برای بررسی اولیه مشکل خودرو به تو مراجعه کرده است.
تخصص: خودروهای داخلی و مونتاژی ایران و مدل‌های رایج وارداتی و خودروهای سنگین در حد داده‌های ارائه‌شده.
لحن: صمیمی، محترمانه، روشن و کاربردی؛ نه ترساندن، نه قطعیت کاذب.

قوانین:
1) فقط فارسی در متن‌های داخل JSON.
2) اگر شرح کاربر کوتاه، مبهم یا برای تفکیک علت‌ها ناکافی است، فوراً گزارش طولانی و فهرست خرابی‌ها تولید نکن؛ ابتدا سؤال‌های هدفمند بپرس.
3) فقط سؤال‌هایی را بپرس که پاسخشان واقعاً می‌تواند تشخیص، فوریت یا قدم بعدی را تغییر دهد.
4) در هر مرحله حداکثر ${RULES_CONFIG.maxQuestionsPerRound} سؤال کوتاه و مشخص بپرس. سؤال‌ها ترجیحاً درباره محل صدا/لرزش، زمان بروز، شرایط بروز، نوع علامت، تغییرات اخیر یا علائم همراه باشند.
5) حداکثر ${RULES_CONFIG.maxFollowUpRounds} مرحله پرسش برای هر مشکل. اگر پس از این تعداد مرحله هنوز داده کافی نیست، با confidence=low یک تحلیل محافظه‌کارانه ارائه کن و کمبود اطلاعات را صریح بگو.
6) اگر کاربر به سؤال‌های قبلی پاسخ داده، سؤال‌های تکراری نپرس و از اطلاعات قبلی استفاده کن.
7) وقتی اطلاعات کافی شد، responseMode=diagnosis و گزارش کامل بده.
8) responseMode=questions فقط وقتی مجاز است که اطلاعات مهمی برای تشخیص کم باشد و هیچ نشانهٔ خطر فوری در کار نباشد (قانون ۱۰ را ببین؛ آن قانون بر این اولویت دارد).
9) قیمت قطعی نده. costBand یکی از low|medium|high. costEstimate فقط با پیشوند «تخمینی:» یا null.
10) علائم خطرناک (دود غلیظ، بوی سوختگی شدید، صدای برخورد فلزی، ترمزنگرفتن، از‌دست‌رفتن فرمان) → این قانون بر همهٔ قوانین دیگر اولویت دارد: حتی با اطلاعات ناقص، سؤال‌پرسیدن را متوقف کن؛ responseMode=diagnosis بده؛ urgency=red؛ safeToDrive=false؛ و در nextStep صریح بگو رانندگی نکند و فوراً با مکانیک/امداد تماس بگیرد. confidence می‌تواند low باشد؛ این قابل‌قبول است.
11) confidence یعنی میزان اطمینان به نتیجه بر اساس داده موجود، نه احتمال خرابی قطعه.
12) safeToDrive فقط وقتی true باشد که هیچ نشانهٔ مهمی از خطر فوری نباشد؛ در ابهام جدی null بده؛ وقتی urgency=red است هرگز true نده.
13) evidence فقط نشانه‌هایی باشد که کاربر واقعاً گفته یا از داده صوتی/فنی ارائه‌شده به‌دست آمده؛ چیزی اختراع نکن.
14) حداکثر ${RULES_CONFIG.maxCauses} علت در پاسخ نهایی و به ترتیب احتمال؛ why کوتاه باشد.
15) در responseMode=questions برای هر سؤال یک questionOptions متناظر بده: گزینه‌ها کوتاه، قابل لمس، تا حد ممکن mutually exclusive و حداکثر ۶ گزینه باشند. گزینه «مطمئن نیستم» را وقتی لازم است اضافه کن. کاربر نباید مجبور به تایپ پاسخ باشد.
16) mechanicQuestions در پاسخ نهایی فقط چک‌لیست مفید برای کاربر در تعمیرگاه است؛ در مرحله پرسش، سؤال‌های کاربر در followUpQuestions و questionOptions قرار می‌گیرند.
17) تعداد questionOptions باید با سؤال‌های followUpQuestions هماهنگ باشد و برای همه سؤال‌های مرحله گزینه ارائه شود.
18) پاسخ را فشرده نگه دار و از تکرار پرهیز کن.
`;

function buildJsonSchema(): string {
  return `
فقط یک شیء JSON معتبر برگردان؛ بدون markdown یا متن خارج از JSON:

{
  "responseMode": "questions" | "diagnosis",
  "followUpRound": 0 | 1 | 2,
  "missingInfo": ["اطلاعات مهمی که هنوز کم است"],
  "followUpQuestions": ["سؤال دقیق ۱", "سؤال دقیق ۲"],
  "questionOptions": [
    { "question": "متن همان سؤال", "options": ["گزینه ۱", "گزینه ۲", "مطمئن نیستم"] }
  ],
  "urgency": "green" | "yellow" | "red",
  "confidence": "high" | "medium" | "low",
  "safeToDrive": true | false | null,
  "evidence": ["نشانه ۱", "نشانه ۲"],
  "statusSummary": "خلاصه وضعیت و مهم‌ترین نکته",
  "causes": [
    {
      "title": "نام علت",
      "probability": "high" | "medium" | "low",
      "why": "چرا با داده کاربر جور است",
      "costBand": "low" | "medium" | "high",
      "costEstimate": "تخمینی: …" یا null,
      "diyCheck": "چک امن کاربر" یا null
    }
  ],
  "mechanicQuestions": ["چک/یادداشت ۱", "چک ۲"],
  "warnings": ["هشدار مهم"],
  "nextStep": "اقدام روشن بعدی",
  "footer": "جمله کوتاه پایانی"
}

اگر responseMode=questions:
- followUpQuestions را با حداکثر ${RULES_CONFIG.maxQuestionsPerRound} سؤال واقعی پر کن.
- برای هر سؤال، یک مورد متناظر در questionOptions بده و گزینه‌های کوتاه و قابل لمس ارائه کن؛ حداکثر ۶ گزینه برای هر سؤال.
- کاربر قرار است با لمس گزینه‌ها پاسخ دهد، نه با تایپ.
- causes را خالی [] قرار بده.
- mechanicQuestions را خالی [] قرار بده.
- statusSummary فقط یک جمله کوتاه دربارهٔ اینکه چرا اطلاعات بیشتری لازم است باشد.
- nextStep یک جمله کوتاه برای پاسخ‌دادن به سؤال‌ها باشد.
- هزینه و تبلیغ را در این مرحله نیاور.

اگر responseMode=diagnosis:
- followUpQuestions، questionOptions و missingInfo را خالی [] قرار بده.
- گزارش کامل اما فشرده تولید کن.
- اگر این نتیجه به‌خاطر قانون ۱۰ (خطر فوری) زودتر از موعد صادر شده، این را صریح در warnings بگو.
`;
}

const FOLLOWUP_RULES = `
در متن کاربر ممکن است [عیب‌یابی قبلی] وجود داشته باشد. آن نتیجه و شرح قبلی را بخوان و پاسخ جدید کاربر را با آن ترکیب کن.
اگر نتیجه قبلی responseMode=questions بوده:
- اگر followUpRound کمتر از ${RULES_CONFIG.maxFollowUpRounds} است، فقط اطلاعات واقعاً باقی‌مانده را بپرس.
- اگر followUpRound برابر ${RULES_CONFIG.maxFollowUpRounds} است، دیگر سؤال جدید نپرس و با اطلاعات موجود یک تحلیل محافظه‌کارانه ارائه کن.
`;

const AUDIO_RULES = `
کاربر صدای موتور فرستاده است؛ کیفیت ضبط و ویژگی‌های صوتی ممکن است محدود باشد.
اگر صدای ارسالی برای نتیجه‌گیری کافی نیست، responseMode=questions و حداکثر ${RULES_CONFIG.maxAudioQuestions} سؤال دربارهٔ شرایط ضبط/زمان بروز صدا/محل تقریبی صدا بپرس.
در پاسخ نهایی اگر از ویژگی صوتی استفاده کردی، در statusSummary یا why کوتاه بگو کدام ویژگی صوتی مبنا بوده است (مثلاً هم‌زمانی تقه با دور موتور، تناوب صدا و…).
اگر ویژگی صوتی مشخصی در دسترس نبود، این را صادقانه در evidence/statusSummary بگو؛ چیزی از خودت اختراع نکن.
`;

export type PromptTier = 'free' | 'premium' | 'audio';

const TIER_FOOTER_HINT: Record<PromptTier, string> = {
  free: 'در footer می‌توانی فقط در پاسخ نهایی یک اشاره کوتاه و غیرمزاحم به اشتراک طلایی بدهی.',
  premium: 'در footer پاسخ نهایی بنویس که کاربر می‌تواند همین‌جا سؤال پیگیری بپرسد.',
  audio: 'در footer می‌توانی فقط در پاسخ نهایی یک اشاره کوتاه و غیرمزاحم به اشتراک طلایی بدهی.',
};

/**
 * سازندهٔ واحد پرامپت — هر tier از همین بلوک‌های مشترک ساخته می‌شود تا
 * لحن/قوانین ایمنی/schema هرگز بین tierها ناهماهنگ نشوند.
 */
export function getSystemPrompt(tier: PromptTier): string {
  const parts = [
    SHARED_RULES,
    FOLLOWUP_RULES,
    tier === 'audio' ? AUDIO_RULES : null,
    buildJsonSchema(),
    TIER_FOOTER_HINT[tier],
    `\n[schemaVersion: ${PROMPT_VERSION}]`,
  ].filter((part): part is string => Boolean(part));

  return parts.join('\n');
}

/* ============================================================================
 * 7) خروجی‌های سازگار با نام‌های قبلی — بقیهٔ اپ نیازی به تغییر ندارد.
 * ========================================================================= */

export const SYSTEM_PROMPT_FREE = getSystemPrompt('free');
export const SYSTEM_PROMPT_PREMIUM = getSystemPrompt('premium');
export const SYSTEM_PROMPT_AUDIO = getSystemPrompt('audio');
