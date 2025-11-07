// Comprehensive logging utility for BHIT Work OS

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    
    return `${prefix} ${message}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      stack: error?.stack,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
    };
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      // Client-side: try to get from localStorage or session
      try {
        const userSession = localStorage.getItem('bhit-auth-token');
        if (userSession) {
          const parsed = JSON.parse(userSession);
          return parsed.user?.id;
        }
      } catch {
        // Ignore parsing errors
      }
    }
    
    return undefined;
  }

  private getSessionId(): string | undefined {
    if (typeof window !== 'undefined') {
      // Generate or retrieve session ID
      let sessionId = sessionStorage.getItem('bhit-session-id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('bhit-session-id', sessionId);
      }
      return sessionId;
    }
    
    return undefined;
  }

  private logToConsole(entry: LogEntry): void {
    const consoleMethod = entry.level === 'debug' ? 'debug' :
                         entry.level === 'info' ? 'info' :
                         entry.level === 'warn' ? 'warn' : 'error';

    if (this.isDevelopment) {
      // Enhanced development logging with colors and formatting
      const styles = {
        debug: 'color: #6B7280',
        info: 'color: #3B82F6',
        warn: 'color: #F59E0B',
        error: 'color: #EF4444',
      };

      // eslint-disable-next-line no-console
      console[consoleMethod](
        `%c${entry.level.toUpperCase()}`,
        styles[entry.level],
        entry.message,
        entry.context || ''
      );

      if (entry.stack) {
        // eslint-disable-next-line no-console
        console.error(entry.stack);
      }
    } else {
      // Production logging - structured JSON
      // eslint-disable-next-line no-console
      console[consoleMethod](JSON.stringify(entry));
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    // Only log to remote in production or if explicitly enabled
    if (this.isDevelopment && !process.env.ENABLE_REMOTE_LOGGING) {
      return;
    }

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error: unknown) {
      // Fallback to console if remote logging fails
      console.error('Failed to log to remote service:', error);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createLogEntry('debug', message, context);
    this.logToConsole(entry);
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createLogEntry('info', message, context);
    this.logToConsole(entry);
    
    // Optionally log to remote service
    if (entry.level === 'error' || entry.level === 'warn') {
      this.logToRemote(entry).catch(() => {}); // Fire and forget
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createLogEntry('warn', message, context);
    this.logToConsole(entry);
    this.logToRemote(entry).catch(() => {});
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;

    const entry = this.createLogEntry('error', message, context, error);
    this.logToConsole(entry);
    this.logToRemote(entry).catch(() => {});
  }

  // Specialized logging methods
  apiCall(method: string, endpoint: string, duration?: number, status?: number): void {
    this.info('API Call', {
      method,
      endpoint,
      duration,
      status,
      type: 'api_call',
    });
  }

  userAction(action: string, details?: Record<string, unknown>): void {
    this.info('User Action', {
      action,
      ...details,
      type: 'user_action',
    });
  }

  performance(name: string, duration: number, details?: Record<string, unknown>): void {
    this.info('Performance Metric', {
      name,
      duration,
      ...details,
      type: 'performance',
    });
  }

  security(event: string, details?: Record<string, unknown>): void {
    this.warn('Security Event', {
      event,
      ...details,
      type: 'security',
    });
  }

  // Timer utility
  startTimer(name: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.performance(name, duration);
    };
  }
}

// Create singleton logger instance
const logger = new Logger();

// Export convenience functions
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  apiCall: logger.apiCall.bind(logger),
  userAction: logger.userAction.bind(logger),
  performance: logger.performance.bind(logger),
  security: logger.security.bind(logger),
  startTimer: logger.startTimer.bind(logger),
};

export default logger;

// React hook for logging user actions
export function useLogger() {
  const logUserAction = (action: string, details?: Record<string, unknown>) => {
    log.userAction(action, details);
  };

  const logError = (message: string, error?: Error, context?: Record<string, unknown>) => {
    log.error(message, error, context);
  };

  return {
    logUserAction,
    logError,
    ...log,
  };
}

// Higher-order function to add logging to async functions
export function withLogging<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) {
  return async (...args: T): Promise<R> => {
    const endTimer = log.startTimer(name);
    
    try {
      log.debug(`Starting ${name}`, { args });
      const result = await fn(...args);
      log.debug(`Completed ${name}`, { success: true });
      return result;
    } catch (error: unknown) {
      log.error(`Failed ${name}`, error as Error, { args });
      throw error;
    } finally {
      endTimer();
    }
  };
}