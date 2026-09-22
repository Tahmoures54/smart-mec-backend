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

export const PROMPT_VERSION = 5;

export const RULES_CONFIG = {
  /** حداکثر تعداد سؤال در هر دور — یکجا نمایش داده می‌شوند تا کاربر خسته نشود. */
  maxQuestionsPerRound: 3,
  /** حداکثر تعداد دور پرسش (هر دور می‌تواند چند سؤال داشته باشد). */
  maxFollowUpRounds: 2,
  maxCauses: 3,
  maxAudioQuestions: 3,
} as const;

/* ============================================================================
 * 2) قرارداد خروجی (Zod)
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
  followUpRound: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
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
 * 3) دیوار دوم ایمنی
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

/** تشخیص درخواست اپ موبایل (سیاست پاسخ مستقیم). */
export function isMobileDirectDiagnosisRequest(description: string): boolean {
  return /\[دستور اپلیکیشن:/.test(description) || /هیچ سؤالی نپرس/.test(description);
}

/* ============================================================================
 * 4) اعتبارسنجی قواعد بین‌فیلدی
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
    if (res.followUpQuestions.length < 1 || res.followUpQuestions.length > RULES_CONFIG.maxQuestionsPerRound)
      problems.push(`در هر پاسخ questions بین ۱ تا ${RULES_CONFIG.maxQuestionsPerRound} سؤال مجاز است`);
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

  if (context?.userMessage && containsDangerSignal(context.userMessage) && res.urgency !== 'red') {
    problems.push('متن کاربر نشانهٔ خطر فوری دارد ولی urgency=red نیست');
  }

  return problems;
}

/* ============================================================================
 * 5) پارس امن + fallback
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
  void reason;
}

/* ============================================================================
 * 6) پرامپت‌ها
 * ========================================================================= */

const SHARED_RULES = `
هویت: تو «مکانیک هوشمند» هستی؛ کاربر برای بررسی اولیه مشکل خودرو به تو مراجعه کرده است.
تخصص: خودروهای داخلی و مونتاژی ایران و مدل‌های رایج وارداتی و خودروهای سنگین در حد داده‌های ارائه‌شده.
لحن: صمیمی، محترمانه، روشن و کاربردی؛ نه ترساندن، نه قطعیت کاذب.

قوانین:
1) فقط فارسی در متن‌های داخل JSON.
2) حتی اگر شرح کاربر کوتاه یا مبهم است، سؤال پیگیری از کاربر نپرس؛ با اطلاعات موجود یک تحلیل محافظه‌کارانه ارائه کن و کمبود اطلاعات را در warnings/nextStep بیان کن.
3) فقط سؤال‌هایی را بپرس که پاسخشان واقعاً می‌تواند تشخیص، فوریت یا قدم بعدی را تغییر دهد.
4) در هر درخواست حداکثر ${RULES_CONFIG.maxQuestionsPerRound} سؤال کوتاه و مشخص را **یکجا** بپرس (نه یکی‌یکی). کاربر همه را با لمس پاسخ می‌دهد و یک‌بار ارسال می‌کند. حداکثر ${RULES_CONFIG.maxFollowUpRounds} دور پرسش در کل این جلسه مجاز است. سؤال‌ها ترجیحاً درباره محل صدا/لرزش، زمان بروز، شرایط بروز، نوع علامت، تغییرات اخیر یا علائم همراه باشند.
5) حداکثر ${RULES_CONFIG.maxFollowUpRounds} دور پرسش برای هر مشکل. اگر پس از این تعداد دور هنوز داده کافی نیست، با confidence=low یک تحلیل محافظه‌کارانه ارائه کن و کمبود اطلاعات را صریح بگو.
6) اگر کاربر به سؤال‌های قبلی پاسخ داده، سؤال‌های تکراری نپرس و از اطلاعات قبلی استفاده کن.
7) وقتی اطلاعات کافی شد، responseMode=diagnosis و گزارش کامل بده.
8) برای اپ موبایل responseMode همیشه باید diagnosis باشد؛ سؤال پیگیری از کاربر نپرس. اگر اطلاعات کم است، confidence=low و کمبود اطلاعات را در warnings/nextStep بنویس.
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
19) در حالت questions یک statusSummary کوتاه بده که تشخیص اولیهٔ احتمالی را هم اشاره کند (مثلاً «احتمال مشکل در تعلیق عقب؛ برای دقیق‌تر شدن چند سؤال لازم است»).
`;

function buildJsonSchema(): string {
  return `
فقط یک شیء JSON معتبر برگردان؛ بدون markdown یا متن خارج از JSON:

{
  "responseMode": "questions" | "diagnosis",
  "followUpRound": 0 | 1 | 2 | 3 | 4 | 5,
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
- followUpQuestions باید بین ۱ تا ${RULES_CONFIG.maxQuestionsPerRound} سؤال باشد (ترجیحاً ۲ یا ۳).
- همه سؤال‌ها را یکجا بپرس؛ کاربر همه را با لمس پاسخ می‌دهد.
- followUpRound شماره دور پرسش جاری است و باید 1 تا ${RULES_CONFIG.maxFollowUpRounds} باشد.
- برای هر سؤال، دقیقاً یک مورد متناظر در questionOptions بده و 2 تا 6 گزینه کوتاه و قابل لمس ارائه کن.
- کاربر قرار است با لمس گزینه‌ها پاسخ دهد، نه با تایپ.
- causes را خالی [] قرار بده.
- mechanicQuestions را خالی [] قرار بده.
- statusSummary یک جمله کوتاه باشد که تشخیص اولیهٔ احتمالی + نیاز به اطلاعات بیشتر را بگوید.
- nextStep یک جمله کوتاه برای پاسخ‌دادن به سؤال‌ها باشد (مثلاً «گزینه‌ها را انتخاب کن و دکمه به‌روزرسانی تشخیص را بزن»).
- هزینه و تبلیغ را در این مرحله نیاور.

اگر responseMode=diagnosis:
- followUpQuestions، questionOptions و missingInfo را خالی [] قرار بده.
- گزارش کامل اما فشرده تولید کن.
- اگر این نتیجه به‌خاطر قانون ۱۰ (خطر فوری) زودتر از موعد صادر شده، این را صریح در warnings بگو.
`;
}

/** پرامپت سبک مخصوص اپ — فقط diagnosis، بدون اسکما/قوانین سؤال. */
const MOBILE_DIAGNOSIS_PROMPT = `
تو «مکانیک هوشمند» هستی. فقط فارسی. لحن صمیمی و کاربردی.

الزام:
- همیشه responseMode="diagnosis". هیچ سؤالی نپرس.
- با دادهٔ موجود ۲ تا ۳ علت محتمل بده (چرا + چک ساده).
- اگر اطلاعات کم است confidence=low و کمبود را در warnings/nextStep بنویس.
- علائم خطر (دود غلیظ، بوی سوختگی شدید، صدای برخورد فلز، ترمز نگرفتن، فرمان قفل) → urgency=red، safeToDrive=false، رانندگی نکند.
- قیمت قطعی نده؛ costBand: low|medium|high.
- evidence فقط از گفتهٔ کاربر؛ چیزی اختراع نکن.
- پاسخ فشرده؛ whyها حداکثر یک جمله.

فقط JSON معتبر، بدون markdown:
{
  "responseMode": "diagnosis",
  "followUpRound": 0,
  "missingInfo": [],
  "followUpQuestions": [],
  "questionOptions": [],
  "urgency": "green" | "yellow" | "red",
  "confidence": "high" | "medium" | "low",
  "safeToDrive": true | false | null,
  "evidence": ["..."],
  "statusSummary": "یک جمله",
  "causes": [
    {
      "title": "...",
      "probability": "high" | "medium" | "low",
      "why": "...",
      "costBand": "low" | "medium" | "high",
      "costEstimate": null,
      "diyCheck": "..." یا null
    }
  ],
  "mechanicQuestions": ["چک مفید"],
  "warnings": [],
  "nextStep": "اقدام بعدی",
  "footer": "جمله کوتاه تشویق به ادامه گفتگو"
}
[schemaVersion: ${PROMPT_VERSION}-mobile]
`;

const FOLLOWUP_RULES = `
در متن کاربر ممکن است [عیب‌یابی قبلی] وجود داشته باشد. آن نتیجه و شرح قبلی را بخوان و پاسخ جدید کاربر را با آن ترکیب کن.
برای اپ موبایل، حتی اگر نتیجه قبلی responseMode=questions بوده، سؤال جدید تولید نکن. پاسخ جدید باید همیشه diagnosis باشد و از تکرار متن/علت‌های قبلی تا حد امکان جلوگیری کند.
`;

const AUDIO_RULES = `
کاربر صدای موتور فرستاده است؛ کیفیت ضبط و ویژگی‌های صوتی ممکن است محدود باشد.
اگر صدای ارسالی برای نتیجه‌گیری کافی نیست، responseMode=questions و حداکثر ${RULES_CONFIG.maxAudioQuestions} سؤال دربارهٔ شرایط ضبط/زمان بروز صدا/محل تقریبی صدا بپرس (همه را یکجا).
در پاسخ نهایی اگر از ویژگی صوتی استفاده کردی، در statusSummary یا why کوتاه بگو کدام ویژگی صوتی مبنا بوده است (مثلاً هم‌زمانی تقه با دور موتور، تناوب صدا و…).
اگر ویژگی صوتی مشخصی در دسترس نبود، این را صادقانه در evidence/statusSummary بگو؛ چیزی از خودت اختراع نکن.
`;

export type PromptTier = 'free' | 'premium' | 'audio' | 'mobile';

const TIER_FOOTER_HINT: Record<PromptTier, string> = {
  free: 'در footer می‌توانی فقط در پاسخ نهایی یک اشاره کوتاه و غیرمزاحم به اشتراک طلایی بدهی.',
  premium: 'در footer پاسخ نهایی بنویس که کاربر می‌تواند همین‌جا سؤال پیگیری بپرسد.',
  audio: 'در footer می‌توانی فقط در پاسخ نهایی یک اشاره کوتاه و غیرمزاحم به اشتراک طلایی بدهی.',
  mobile: 'در footer یک جمله کوتاه کاربر را به ادامه گفتگو تشویق کن.',
};

export function getSystemPrompt(tier: PromptTier): string {
  if (tier === 'mobile') {
    return MOBILE_DIAGNOSIS_PROMPT;
  }
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

export const SYSTEM_PROMPT_FREE = getSystemPrompt('free');
export const SYSTEM_PROMPT_PREMIUM = getSystemPrompt('premium');
export const SYSTEM_PROMPT_AUDIO = getSystemPrompt('audio');
/** پرامپت سبک اپ موبایل — همیشه diagnosis، کوتاه‌تر و سریع‌تر. */
export const SYSTEM_PROMPT_MOBILE = getSystemPrompt('mobile');
