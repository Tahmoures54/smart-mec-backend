import { logger } from '@/utils/logger';
import { AppError } from '@/lib/error-handler';

async function callDeepSeek(options: {
  systemPrompt: string;
  userContent: string;
  userId: number;
  timeoutMs: number;
  maxTokens: number;
  apiKey: string;
  apiEndpoint: string;
  model: string;
}): Promise<{ text: string; finishReason?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(`${options.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userContent },
        ],
        temperature: 0.4,
        max_tokens: options.maxTokens,
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
        endpoint: options.apiEndpoint,
        model: options.model,
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
      logger.error('AI empty content', {
        userId: options.userId,
        dataKeys: Object.keys(data || {}),
      });
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
        maxTokens: options.maxTokens,
      });
      if (!text.trim().endsWith('}')) {
        text += '\n}';
      }
    }

    return { text, finishReason };
  } finally {
    clearTimeout(timeoutId);
  }
}

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
    options.timeoutMs ?? parseInt(process.env.AI_TIMEOUT_MS || '75000', 10);
  const maxTokens =
    options.maxTokens ?? parseInt(process.env.AI_MAX_TOKENS || '6000', 10);

  const base = {
    systemPrompt: options.systemPrompt,
    userContent: options.userContent,
    userId: options.userId,
    timeoutMs,
    maxTokens,
    apiKey,
    apiEndpoint,
    model,
  };

  try {
    return await callDeepSeek(base);
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    const e = err as { name?: string; message?: string };
    const isAbort = e.name === 'AbortError';
    logger.error('AI API error', {
      error: e.message,
      userId: options.userId,
      abort: isAbort,
    });

    if (isAbort || /fetch|network|ECONNRESET|ETIMEDOUT/i.test(e.message || '')) {
      logger.info('AI retry once', { userId: options.userId });
      try {
        return await callDeepSeek({
          ...base,
          timeoutMs: Math.min(timeoutMs, 55000),
          maxTokens: Math.min(maxTokens, 4500),
        });
      } catch (retryErr: unknown) {
        if (retryErr instanceof AppError) throw retryErr;
        const re = retryErr as { name?: string; message?: string };
        logger.error('AI retry failed', {
          error: re.message,
          userId: options.userId,
        });
        if (re.name === 'AbortError') {
          throw new AppError(
            'زمان پاسخگویی هوش مصنوعی طولانی شد. لطفاً دوباره تلاش کنید.',
            504,
            'AI_TIMEOUT'
          );
        }
        throw new AppError(
          re.message || 'خطا در برقراری ارتباط با سرویس هوش مصنوعی',
          502,
          'AI_NETWORK_ERROR'
        );
      }
    }

    if (isAbort) {
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
  }
}
