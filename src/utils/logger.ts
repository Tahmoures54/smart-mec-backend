// ═══════════════════════════════════════════════════════════
// Logger Utility - Smart-MEC
// ═══════════════════════════════════════════════════════════

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  env: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      env: process.env.NODE_ENV || 'unknown',
    };
  }

  private getColor(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    return colors[level];
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry = this.formatMessage(level, message, data);

    if (this.isDevelopment) {
      // فرمت رنگی برای محیط development
      const color = this.getColor(level);
      const reset = '\x1b[0m';
      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`,
        data ? data : ''
      );
    } else {
      // فرمت JSON برای محیط production (سازگار با ابزارهای لاگ)
      console.log(JSON.stringify(entry));
    }

    // در production می‌توانید لاگ‌ها را به سرویس‌هایی مثل Sentry بفرستید
    // if (!this.isDevelopment && level === 'error') {
    //   Sentry.captureException(data);
    // }
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

export const logger = new Logger();