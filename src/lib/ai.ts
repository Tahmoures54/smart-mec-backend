import { logger } from '@/utils/logger';
import { AppError } from '@/lib/error-handler';

export async function chatCompletion(options: {
  systemPrompt: string;
  userContent: string;
  userId: number;
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<{ text: string; finishReason?: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiEndpoint = (
    process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1'
  ).replace(/\/$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    logger.error('DEEPSEEK_API_KEY is missing in environment');
    throw new AppError(
      'تنظیمات هوش مصنوعی روی سرور ناقص است. کلید DEEPSEEK_API_KEY را در لیارا تنظیم کنید.',
      503,
      'AI_NOT_CONFIGURED'
    );
  }

  const timeoutMs =
    options.timeoutMs ?? parseInt(process.env.AI_TIMEOUT_MS || '55000', 10);
  const maxTokens =
    options.maxTokens ?? parseInt(process.env.AI_MAX_TOKENS || '4000', 10);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userContent },
        ],
        temperature: 0.5,
        max_tokens: maxTokens,
        user: `user_${options.userId}`,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.text();
        detail = errBody.slice(0, 300);
      } catch {
        /* ignore */
      }
      logger.error('AI provider HTTP error', {
        status: response.status,
        detail,
        userId: options.userId,
        endpoint: apiEndpoint,
        model,
      });
      throw new AppError(
        'هوش مصنوعی در حال حاضر پاسخگو نیست. لطفاً چند دقیقه دیگر تلاش کنید.',
        502,
        'AI_PROVIDER_ERROR'
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const finishReason = choice?.finish_reason as string | undefined;
    let text = choice?.message?.content as string | undefined;

    if (!text) {
      logger.error('AI empty content', { userId: options.userId, dataKeys: Object.keys(data || {}) });
      throw new AppError(
        'پاسخ نامعتبر از سرویس هوش مصنوعی دریافت شد.',
        502,
        'AI_EMPTY_RESPONSE'
      );
    }

    if (finishReason === 'length') {
      logger.warn('AI response was truncated due to max_tokens', {
        userId: options.userId,
        finishReason,
        maxTokens,
      });
      text +=
        '\n\n⚠️ پاسخ به‌دلیل محدودیت توکن ناقص ماند. لطفاً در صورت نیاز دوباره تلاش کنید.';
    }

    return { text, finishReason };
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    const e = err as { name?: string; message?: string };
    logger.error('AI API error', { error: e.message, userId: options.userId });
    if (e.name === 'AbortError') {
      throw new AppError(
        'زمان پاسخگویی هوش مصنوعی طولانی شد. لطفاً دوباره تلاش کنید.',
        504,
        'AI_TIMEOUT'
      );
    }
    throw new AppError(
      e.message || 'خطا در برقراری ارتباط با سرویس هوش مصنوعی',
      502,
      'AI_NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
