export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string };
}

export class Logger {
  private minLevel: LogLevel;
  private module: string;

  constructor(module: string, minLevel: LogLevel = LogLevel.DEBUG) {
    this.module = module;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private formatEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context ? { ...context, module: this.module } : { module: this.module },
    };
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return entry;
  }

  private write(entry: LogEntry): void {
    const json = JSON.stringify(entry);
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(json);
        break;
      case LogLevel.WARN:
        console.warn(json);
        break;
      case LogLevel.INFO:
        console.info(json);
        break;
      case LogLevel.DEBUG:
        console.debug(json);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.write(this.formatEntry(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.write(this.formatEntry(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.write(this.formatEntry(LogLevel.WARN, message, context, error));
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.write(this.formatEntry(LogLevel.ERROR, message, context, error));
    }
  }
}
