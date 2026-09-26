import { logger } from '@/utils/logger';
import { AppError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';

async function callDeepSeek(options: {
  systemPrompt: string;
  userContent: string;
  userId: number;
  timeoutMs: number;
  maxTokens: number;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  thinkingEnabled: boolean;
  reasoningEffort: 'low' | 'high' | 'max';
}): Promise<{ text: string; finishReason?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    // Thinking mode does not support temperature / top_p / presence_penalty / frequency_penalty.
    const body: Record<string, unknown> = {
      model: options.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userContent },
      ],
      thinking: { type: options.thinkingEnabled ? 'enabled' : 'disabled' },
      max_tokens: options.maxTokens,
      user: `user_${options.userId}`,
    };

    if (options.thinkingEnabled) {
      body.reasoning_effort = options.reasoningEffort;
    } else {
      body.temperature = 0.3;
      body.top_p = 0.9;
    }

    const response = await fetch(`${options.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify(body),
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
        thinking: options.thinkingEnabled,
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
    const message = choice?.message;
    // Final answer is in content; reasoning_content is CoT (not returned to the client).
    let text = message?.content as string | undefined;

    if (!text) {
      logger.error('AI empty content', {
        userId: options.userId,
        dataKeys: Object.keys(data || {}),
        hasReasoning: Boolean(message?.reasoning_content),
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
        thinking: options.thinkingEnabled,
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
  if (!options.userContent || options.userContent.length > 12000) {
    throw new AppError(
      'اطلاعات ارسالی برای تحلیل بیش از حد مجاز است.',
      400,
      'AI_INPUT_TOO_LARGE'
    );
  }

  RateLimiter.check(String(options.userId), 'ai_user', 8, 10 * 60 * 1000);

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiEndpoint = (
    process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com'
  ).replace(/\/$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-flash';

  if (!apiKey) {
    logger.error('DEEPSEEK_API_KEY is missing in environment');
    throw new AppError(
      'تنظیمات هوش مصنوعی روی سرور ناقص است. کلید DEEPSEEK_API_KEY را در لیارا تنظیم کنید.',
      503,
      'AI_NOT_CONFIGURED'
    );
  }

  // Thinking on by default; can disable with AI_THINKING=false
  const thinkingEnabled = process.env.AI_THINKING !== 'false';
  const reasoningEffortRaw = (process.env.AI_REASONING_EFFORT || 'high').toLowerCase();
  const reasoningEffort: 'low' | 'high' | 'max' =
    reasoningEffortRaw === 'low' || reasoningEffortRaw === 'max'
      ? reasoningEffortRaw
      : 'high';

  // Thinking consumes completion tokens for CoT — defaults are higher than non-thinking.
  const timeoutMs =
    options.timeoutMs ??
    parseInt(
      process.env.AI_TIMEOUT_MS || (thinkingEnabled ? '90000' : '30000'),
      10
    );
  const maxTokens =
    options.maxTokens ??
    parseInt(
      process.env.AI_MAX_TOKENS || (thinkingEnabled ? '4096' : '1200'),
      10
    );

  const base = {
    systemPrompt: options.systemPrompt,
    userContent: options.userContent,
    userId: options.userId,
    timeoutMs,
    maxTokens,
    apiKey,
    apiEndpoint,
    model,
    thinkingEnabled,
    reasoningEffort,
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
      thinking: thinkingEnabled,
    });

    // Timeout را دوباره تکرار نکن؛ وگرنه یک درخواست موبایل می‌تواند دو برابر
    // زمان انتظار طول بکشد و از timeout کلاینت عبور کند.
    const isTransientNetwork = /fetch|network|ECONNRESET|ETIMEDOUT/i.test(e.message || '');
    if (!isAbort && isTransientNetwork) {
      logger.info('AI retry once', { userId: options.userId });
      try {
        return await callDeepSeek({
          ...base,
          timeoutMs: Math.min(timeoutMs, thinkingEnabled ? 60000 : 15000),
          maxTokens: Math.min(maxTokens, thinkingEnabled ? 4096 : 1200),
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
