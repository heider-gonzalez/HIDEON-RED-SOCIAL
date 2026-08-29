/**
 * Sistema de logging centralizado
 * Proporciona logging estructurado con diferentes niveles y destinos
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;
  private enableConsole: boolean = true;
  private enableRemote: boolean = process.env.NODE_ENV === 'production';
  private logs: LogEntry[] = [];
  private maxLogs = 500;

  constructor() {
    // Determinar nivel mínimo basado en entorno
    if (process.env.NODE_ENV === 'production') {
      this.minLevel = LogLevel.INFO;
    } else {
      this.minLevel = LogLevel.DEBUG;
    }
  }

  /**
   * Registra un mensaje de log
   */
  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
    };

    // Agregar stack trace para errores
    if (level >= LogLevel.ERROR && metadata?.error instanceof Error) {
      entry.stack = metadata.error.stack;
    }

    // Agregar a logs locales
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console logging en desarrollo
    if (this.enableConsole) {
      this.logToConsole(entry);
    }

    // Remote logging en producción
    if (this.enableRemote) {
      this.logToRemote(entry);
    }
  }

  /**
   * Log a la consola con formato
   */
  private logToConsole(entry: LogEntry) {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const levelColors = ['#9ca3af', '#4ade80', '#facc15', '#f87171', '#ef4444'];
    const emoji = ['🔍', 'ℹ️', '⚠️', '❌', '💀'];

    const prefix = `[${entry.timestamp}] [${levelNames[entry.level]}]`;
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const emojiStr = emoji[entry.level];

    const styledMessage = `${emojiStr} ${prefix} ${contextStr} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(styledMessage, entry.metadata);
        break;
      case LogLevel.INFO:
        console.log(styledMessage, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(styledMessage, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(styledMessage, entry.metadata);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  /**
   * Envía logs a servicio remoto (placeholder)
   */
  private async logToRemote(entry: LogEntry) {
    try {
      // Aquí se implementaría el envío a servicios como:
      // - Sentry
      // - LogRocket
      // - Datadog
      // - Custom backend endpoint
      
      // Placeholder para implementación futura
      if (process.env.NODE_ENV === 'development') {
        console.log('[Remote Log]', entry);
      }
    } catch (error) {
      console.error('Error sending log to remote service:', error);
    }
  }

  /**
   * Niveles de logging público
   */
  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  error(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, metadata);
  }

  fatal(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.FATAL, message, context, metadata);
  }

  /**
   * Logging para errores con contexto adicional
   */
  logError(error: Error, context?: string, additionalMetadata?: Record<string, any>) {
    this.error(error.message, context, {
      ...additionalMetadata,
      error,
      stack: error.stack,
    });
  }

  /**
   * Obtiene logs locales
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Limpia logs locales
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Exporta logs para análisis
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Configura el logger
   */
  configure(options: {
    minLevel?: LogLevel;
    enableConsole?: boolean;
    enableRemote?: boolean;
  }) {
    if (options.minLevel !== undefined) {
      this.minLevel = options.minLevel;
    }
    if (options.enableConsole !== undefined) {
      this.enableConsole = options.enableConsole;
    }
    if (options.enableRemote !== undefined) {
      this.enableRemote = options.enableRemote;
    }
  }
}

// Instancia singleton del logger
export const logger = new Logger();

/**
 * Funciones auxiliares para logging común
 */
export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
  logger.info(`Performance: ${operation} took ${duration.toFixed(2)}ms`, 'performance', {
    ...metadata,
    duration,
  });
};

export const logUserAction = (action: string, userId?: string, metadata?: Record<string, any>) => {
  logger.info(`User action: ${action}`, 'user-action', {
    ...metadata,
    userId,
  });
};

export const logApiCall = (endpoint: string, method: string, status: number, duration: number) => {
  const level = status >= 400 ? LogLevel.WARN : LogLevel.INFO;
  logger.log(level, `API Call: ${method} ${endpoint} - Status: ${status}`, 'api', {
    endpoint,
    method,
    status,
    duration,
  });
};