import { NextResponse } from 'next/server';
import { ValidationError } from './validation';
import { logger } from '@/utils/logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'دسترسی غیرمجاز') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'عدم دسترسی') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'یافت نشد') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'درخواست نامعتبر') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(message: string = 'اعتبار کافی نیست') {
    super(message, 402, 'INSUFFICIENT_CREDITS');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'تعداد درخواست بیش از حد مجاز') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

function sanitizeLogText(text: string): string {
  return text
    .replace(/09\d{9}/g, '[PHONE_REDACTED]')
    .replace(/params:\s*[^\n]*/g, 'params: [REDACTED]');
}

function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = sanitizeLogText(value);
    } else if (value instanceof Error) {
      result[key] = {
        message: sanitizeLogText(value.message),
        cause: value.cause ? sanitizeLogData({ cause: value.cause }) : undefined,
      };
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    logger.warn(
      'Validation error',
      sanitizeLogData({ error: error.message, field: error.field })
    );
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        field: error.field,
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    const level = error.statusCode >= 500 ? 'error' : 'warn';
    logger[level](
      'Application error',
      sanitizeLogData({
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      })
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    logger.error(
      'Unexpected error',
      sanitizeLogData({
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      })
    );

    const message =
      process.env.NODE_ENV === 'production'
        ? 'خطای داخلی سرور'
        : error.message;

    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }

  logger.error('Unknown error', error);
  return NextResponse.json(
    {
      success: false,
      error: 'خطای ناشناخته',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  );
}

export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}
