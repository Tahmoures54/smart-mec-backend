import { logger } from '@/utils/logger';

export async function chatCompletion(options: {
  systemPrompt: string;
  userContent: string;
  userId: number;
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<{ text: string; finishReason?: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiEndpoint =
    process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('تنظیمات هوش مصنوعی در سرور ناقص است.');
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
      throw new Error(
        'هوش مصنوعی در حال حاضر پاسخگو نیست. لطفاً چند دقیقه دیگر تلاش کنید.'
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const finishReason = choice?.finish_reason as string | undefined;
    let text = choice?.message?.content as string | undefined;

    if (!text) {
      throw new Error('پاسخ نامعتبر از سرویس هوش مصنوعی');
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
    const e = err as { name?: string; message?: string };
    logger.error('AI API error', { error: e.message, userId: options.userId });
    if (e.name === 'AbortError') {
      throw new Error(
        'زمان پاسخگویی هوش مصنوعی طولانی شد. لطفاً دوباره تلاش کنید.'
      );
    }
    throw new Error(e.message || 'خطا در برقراری ارتباط با سرویس هوش مصنوعی');
  } finally {
    clearTimeout(timeoutId);
  }
}
