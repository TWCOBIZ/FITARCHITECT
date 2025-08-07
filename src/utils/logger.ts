/**
 * Centralized logging utility with environment-aware controls
 * Provides consistent logging across the application with production safety
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 'workout' | 'nutrition' | 'cache' | 'api' | 'auth' | 'general';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  categories: Set<LogCategory>;
  showTimestamps: boolean;
  showCategories: boolean;
}

class Logger {
  private config: LogConfig;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
    
    // Default configuration
    this.config = {
      enabled: this.isDevelopment,
      level: this.isDevelopment ? 'debug' : 'error',
      categories: new Set(['workout', 'nutrition', 'cache', 'api', 'auth', 'general']),
      showTimestamps: this.isDevelopment,
      showCategories: this.isDevelopment
    };

    // Allow override via localStorage for debugging
    this.loadUserPreferences();
  }

  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem('fitarchitect_log_config');
      if (saved) {
        const userConfig = JSON.parse(saved);
        this.config = {
          ...this.config,
          ...userConfig,
          categories: new Set(userConfig.categories || Array.from(this.config.categories))
        };
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    if (!this.config.enabled) return false;
    if (!this.config.categories.has(category)) return false;

    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, category: LogCategory, message: string, data?: any): [string, any?] {
    const parts: string[] = [];

    if (this.config.showTimestamps) {
      parts.push(`[${new Date().toLocaleTimeString()}]`);
    }

    if (this.config.showCategories) {
      parts.push(`[${category.toUpperCase()}]`);
    }

    const formattedMessage = parts.length > 0 ? `${parts.join(' ')} ${message}` : message;

    return data !== undefined ? [formattedMessage, data] : [formattedMessage];
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
    if (!this.shouldLog(level, category)) return;

    const [formattedMessage, logData] = this.formatMessage(level, category, message, data);

    switch (level) {
      case 'debug':
        logData !== undefined ? console.debug(formattedMessage, logData) : console.debug(formattedMessage);
        break;
      case 'info':
        logData !== undefined ? console.info(formattedMessage, logData) : console.info(formattedMessage);
        break;
      case 'warn':
        logData !== undefined ? console.warn(formattedMessage, logData) : console.warn(formattedMessage);
        break;
      case 'error':
        logData !== undefined ? console.error(formattedMessage, logData) : console.error(formattedMessage);
        break;
    }
  }

  // Direct logging methods (for backward compatibility and convenience)
  info = (message: string, data?: any) => this.log('info', 'general', message, data);
  debug = (message: string, data?: any) => this.log('debug', 'general', message, data);
  warn = (message: string, data?: any) => this.log('warn', 'general', message, data);
  error = (message: string, data?: any) => this.log('error', 'general', message, data);

  // Convenience methods for different categories
  workout = {
    debug: (message: string, data?: any) => this.log('debug', 'workout', message, data),
    info: (message: string, data?: any) => this.log('info', 'workout', message, data),
    warn: (message: string, data?: any) => this.log('warn', 'workout', message, data),
    error: (message: string, data?: any) => this.log('error', 'workout', message, data),
  };

  nutrition = {
    debug: (message: string, data?: any) => this.log('debug', 'nutrition', message, data),
    info: (message: string, data?: any) => this.log('info', 'nutrition', message, data),
    warn: (message: string, data?: any) => this.log('warn', 'nutrition', message, data),
    error: (message: string, data?: any) => this.log('error', 'nutrition', message, data),
  };

  cache = {
    debug: (message: string, data?: any) => this.log('debug', 'cache', message, data),
    info: (message: string, data?: any) => this.log('info', 'cache', message, data),
    warn: (message: string, data?: any) => this.log('warn', 'cache', message, data),
    error: (message: string, data?: any) => this.log('error', 'cache', message, data),
  };

  api = {
    debug: (message: string, data?: any) => this.log('debug', 'api', message, data),
    info: (message: string, data?: any) => this.log('info', 'api', message, data),
    warn: (message: string, data?: any) => this.log('warn', 'api', message, data),
    error: (message: string, data?: any) => this.log('error', 'api', message, data),
  };

  auth = {
    debug: (message: string, data?: any) => this.log('debug', 'auth', message, data),
    info: (message: string, data?: any) => this.log('info', 'auth', message, data),
    warn: (message: string, data?: any) => this.log('warn', 'auth', message, data),
    error: (message: string, data?: any) => this.log('error', 'auth', message, data),
  };

  general = {
    debug: (message: string, data?: any) => this.log('debug', 'general', message, data),
    info: (message: string, data?: any) => this.log('info', 'general', message, data),
    warn: (message: string, data?: any) => this.log('warn', 'general', message, data),
    error: (message: string, data?: any) => this.log('error', 'general', message, data),
  };

  // Configuration methods
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveUserPreferences();
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.saveUserPreferences();
  }

  enableCategory(category: LogCategory): void {
    this.config.categories.add(category);
    this.saveUserPreferences();
  }

  disableCategory(category: LogCategory): void {
    this.config.categories.delete(category);
    this.saveUserPreferences();
  }

  enableDebugMode(): void {
    this.config.enabled = true;
    this.config.level = 'debug';
    this.config.categories = new Set(['workout', 'nutrition', 'cache', 'api', 'auth', 'general']);
    this.saveUserPreferences();
    this.general.info('Debug mode enabled - all categories and levels active');
  }

  disableDebugMode(): void {
    this.config.enabled = this.isDevelopment;
    this.config.level = this.isDevelopment ? 'info' : 'error';
    this.config.categories = new Set(['workout', 'nutrition', 'cache', 'api', 'auth', 'general']);
    this.saveUserPreferences();
    this.general.info('Debug mode disabled - returned to default settings');
  }

  private saveUserPreferences(): void {
    try {
      const configToSave = {
        ...this.config,
        categories: Array.from(this.config.categories)
      };
      localStorage.setItem('fitarchitect_log_config', JSON.stringify(configToSave));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  // Utility method for performance timing
  time(label: string): void {
    if (this.shouldLog('debug', 'general')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug', 'general')) {
      console.timeEnd(label);
    }
  }

  // Group logging for related operations
  group(label: string): void {
    if (this.shouldLog('debug', 'general')) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog('debug', 'general')) {
      console.groupEnd();
    }
  }

  // Debug helper to show current configuration
  showConfig(): void {
    console.table({
      'Environment': this.isDevelopment ? 'Development' : 'Production',
      'Logging Enabled': this.config.enabled,
      'Log Level': this.config.level,
      'Active Categories': Array.from(this.config.categories).join(', '),
      'Show Timestamps': this.config.showTimestamps,
      'Show Categories': this.config.showCategories
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Add global debug helpers for development
if (typeof window !== 'undefined') {
  (window as any).fitarchitect_logger = {
    enable: () => logger.setEnabled(true),
    disable: () => logger.setEnabled(false),
    debug: () => logger.enableDebugMode(),
    normal: () => logger.disableDebugMode(),
    config: () => logger.showConfig(),
    level: (level: LogLevel) => logger.setLevel(level),
    category: {
      enable: (cat: LogCategory) => logger.enableCategory(cat),
      disable: (cat: LogCategory) => logger.disableCategory(cat)
    }
  };
}

// Legacy console fallback for critical errors (always logs)
export const criticalError = (message: string, error?: any): void => {
  console.error(`[CRITICAL] ${message}`, error);
};

export default logger;