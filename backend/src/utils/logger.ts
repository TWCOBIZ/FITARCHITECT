/**
 * Comprehensive Logging System for FitArchitect Backend
 * 
 * Provides structured logging with:
 * - Multiple log levels (debug, info, warn, error)
 * - Contextual information (request IDs, user IDs, operation context)
 * - Performance metrics tracking
 * - Error categorization and correlation
 * - Health monitoring integration
 */

interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  component?: string;
  metadata?: Record<string, any>;
}

interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  success: boolean;
  errorType?: string;
}

interface HealthMetrics {
  timestamp: number;
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: Record<string, number>;
  alerts?: string[];
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static instance: Logger;
  private performanceMetrics: PerformanceMetrics[] = [];
  private healthMetrics: HealthMetrics[] = [];
  private errorCounts = new Map<string, number>();
  private readonly maxMetricsHistory = 1000;
  
  private constructor() {
    // Cleanup old metrics every hour
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000);
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context && {
        requestId: context.requestId,
        userId: context.userId,
        operation: context.operation,
        component: context.component,
        metadata: context.metadata
      }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          code: (error as any).code
        }
      })
    };

    return JSON.stringify(logEntry);
  }

  private shouldLog(level: LogLevel): boolean {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context, error));
    }
    
    // Track warning for health monitoring
    this.recordHealthEvent('warning', context?.component || 'unknown', message);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context, error));
    }
    
    // Track error for monitoring
    const errorKey = `${context?.component || 'unknown'}:${error?.name || 'UnknownError'}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    
    this.recordHealthEvent('error', context?.component || 'unknown', message, error);
  }

  // Performance monitoring methods
  startOperation(operation: string, context?: LogContext): string {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.info(`Starting operation: ${operation}`, {
      ...context,
      operation,
      metadata: { ...context?.metadata, operationId }
    });

    return operationId;
  }

  endOperation(operationId: string, operation: string, success: boolean = true, error?: Error, context?: LogContext): void {
    const startTime = parseInt(operationId.split('-')[1]);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const performanceMetric: PerformanceMetrics = {
      startTime,
      endTime,
      duration,
      operation,
      success,
      errorType: error?.name
    };

    this.performanceMetrics.push(performanceMetric);
    
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsHistory);
    }

    const logMessage = `Operation ${operation} ${success ? 'completed' : 'failed'} in ${duration}ms`;
    
    if (success) {
      this.info(logMessage, {
        ...context,
        operation,
        metadata: { ...context?.metadata, operationId, duration, success }
      });
    } else {
      this.error(logMessage, {
        ...context,
        operation,
        metadata: { ...context?.metadata, operationId, duration, success }
      }, error);
    }
  }

  // Health monitoring methods
  recordHealthEvent(type: 'info' | 'warning' | 'error', component: string, message: string, error?: Error): void {
    const timestamp = Date.now();
    const oneHourAgo = timestamp - (60 * 60 * 1000);
    
    // Clean up old health metrics
    this.healthMetrics = this.healthMetrics.filter(metric => metric.timestamp > oneHourAgo);
    
    // Count recent events for this component
    const recentEvents = this.healthMetrics.filter(
      metric => metric.component === component && metric.timestamp > timestamp - (5 * 60 * 1000)
    );
    
    const errorCount = recentEvents.filter(metric => metric.status === 'unhealthy').length;
    const warningCount = recentEvents.filter(metric => metric.status === 'degraded').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const alerts: string[] = [];
    
    if (type === 'error' || errorCount >= 5) {
      status = 'unhealthy';
      if (errorCount >= 5) alerts.push(`High error rate detected: ${errorCount} errors in 5 minutes`);
    } else if (type === 'warning' || warningCount >= 10) {
      status = 'degraded';
      if (warningCount >= 10) alerts.push(`High warning rate detected: ${warningCount} warnings in 5 minutes`);
    }

    const healthMetric: HealthMetrics = {
      timestamp,
      component,
      status,
      metrics: {
        errorCount,
        warningCount,
        totalEvents: recentEvents.length
      },
      ...(alerts.length > 0 && { alerts })
    };

    this.healthMetrics.push(healthMetric);
  }

  // Analytics and reporting methods
  getPerformanceReport(operation?: string, timeRange?: number): {
    averageDuration: number;
    successRate: number;
    totalOperations: number;
    errorBreakdown: Record<string, number>;
    percentiles: { p50: number; p95: number; p99: number };
  } {
    const cutoffTime = timeRange ? Date.now() - timeRange : 0;
    let metrics = this.performanceMetrics.filter(metric => metric.startTime > cutoffTime);
    
    if (operation) {
      metrics = metrics.filter(metric => metric.operation === operation);
    }

    if (metrics.length === 0) {
      return {
        averageDuration: 0,
        successRate: 0,
        totalOperations: 0,
        errorBreakdown: {},
        percentiles: { p50: 0, p95: 0, p99: 0 }
      };
    }

    const durations = metrics.map(m => m.duration!).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;
    const errorBreakdown: Record<string, number> = {};
    
    metrics.filter(m => !m.success && m.errorType).forEach(m => {
      errorBreakdown[m.errorType!] = (errorBreakdown[m.errorType!] || 0) + 1;
    });

    return {
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      successRate: (successCount / metrics.length) * 100,
      totalOperations: metrics.length,
      errorBreakdown,
      percentiles: {
        p50: durations[Math.floor(durations.length * 0.5)] || 0,
        p95: durations[Math.floor(durations.length * 0.95)] || 0,
        p99: durations[Math.floor(durations.length * 0.99)] || 0
      }
    };
  }

  getHealthReport(component?: string): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastSeen: number;
      errorCount: number;
      warningCount: number;
      alerts: string[];
    }>;
    summary: {
      totalComponents: number;
      healthyComponents: number;
      degradedComponents: number;
      unhealthyComponents: number;
    };
  } {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentMetrics = this.healthMetrics.filter(metric => metric.timestamp > oneHourAgo);
    
    const componentStatus: Record<string, any> = {};
    const components = [...new Set(recentMetrics.map(m => m.component))];
    
    if (component) {
      // Filter to specific component
      const filteredComponents = components.filter(c => c === component);
      components.length = 0;
      components.push(...filteredComponents);
    }
    
    components.forEach(comp => {
      const compMetrics = recentMetrics.filter(m => m.component === comp);
      const latest = compMetrics[compMetrics.length - 1];
      
      const errorCount = compMetrics.filter(m => m.status === 'unhealthy').length;
      const warningCount = compMetrics.filter(m => m.status === 'degraded').length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const alerts: string[] = [];
      
      if (errorCount > 0) {
        status = 'unhealthy';
        alerts.push(`${errorCount} errors detected in the last hour`);
      } else if (warningCount > 0) {
        status = 'degraded';
        alerts.push(`${warningCount} warnings detected in the last hour`);
      }
      
      // Add alerts from latest metric
      if (latest?.alerts) {
        alerts.push(...latest.alerts);
      }
      
      componentStatus[comp] = {
        status,
        lastSeen: latest?.timestamp || 0,
        errorCount,
        warningCount,
        alerts
      };
    });
    
    const healthyCount = Object.values(componentStatus).filter((s: any) => s.status === 'healthy').length;
    const degradedCount = Object.values(componentStatus).filter((s: any) => s.status === 'degraded').length;
    const unhealthyCount = Object.values(componentStatus).filter((s: any) => s.status === 'unhealthy').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }
    
    return {
      overall,
      components: componentStatus,
      summary: {
        totalComponents: components.length,
        healthyComponents: healthyCount,
        degradedComponents: degradedCount,
        unhealthyComponents: unhealthyCount
      }
    };
  }

  getErrorSummary(timeRange?: number): {
    totalErrors: number;
    errorsByComponent: Record<string, number>;
    errorsByType: Record<string, number>;
    topErrors: Array<{ key: string; count: number }>;
  } {
    const cutoffTime = timeRange ? Date.now() - timeRange : 0;
    const recentErrors = this.healthMetrics.filter(
      metric => metric.timestamp > cutoffTime && metric.status === 'unhealthy'
    );
    
    const errorsByComponent: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    
    recentErrors.forEach(metric => {
      errorsByComponent[metric.component] = (errorsByComponent[metric.component] || 0) + 1;
    });
    
    // Get error types from error counts map
    Array.from(this.errorCounts.entries()).forEach(([key, count]) => {
      const [component, errorType] = key.split(':');
      if (errorsByComponent[component]) {
        errorsByType[errorType] = (errorsByType[errorType] || 0) + count;
      }
    });
    
    const topErrors = Array.from(this.errorCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalErrors: recentErrors.length,
      errorsByComponent,
      errorsByType,
      topErrors
    };
  }

  // Utility methods
  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Clean performance metrics (keep last 1000)
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsHistory);
    }
    
    // Clean health metrics (keep last hour)
    this.healthMetrics = this.healthMetrics.filter(metric => metric.timestamp > oneHourAgo);
    
    // Clean error counts (reset every hour)
    this.errorCounts.clear();
  }

  // Export logs for external systems
  exportLogs(timeRange: number = 60 * 60 * 1000): {
    performanceMetrics: PerformanceMetrics[];
    healthMetrics: HealthMetrics[];
    summary: {
      performanceReport: any;
      healthReport: any;
      errorSummary: any;
    };
  } {
    const cutoffTime = Date.now() - timeRange;
    
    return {
      performanceMetrics: this.performanceMetrics.filter(m => m.startTime > cutoffTime),
      healthMetrics: this.healthMetrics.filter(m => m.timestamp > cutoffTime),
      summary: {
        performanceReport: this.getPerformanceReport(undefined, timeRange),
        healthReport: this.getHealthReport(),
        errorSummary: this.getErrorSummary(timeRange)
      }
    };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions for common logging patterns
export const logApiRequest = (method: string, path: string, userId?: string, requestId?: string) => {
  // Only log API requests in development or for errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    logger.debug(`API Request: ${method} ${path}`, {
      operation: 'api_request',
      component: 'api',
      userId,
      requestId,
      metadata: { method, path }
    });
  }
};

export const logApiResponse = (method: string, path: string, status: number, duration: number, userId?: string, requestId?: string) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isError = status >= 400;
  
  // In production, only log errors and warnings. In development, log everything
  if (isError || isDevelopment) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'debug';
    logger[level](`API Response: ${method} ${path} - ${status} (${duration}ms)`, {
      operation: 'api_response',
      component: 'api',
      userId,
      requestId,
      metadata: { method, path, status, duration }
    });
  }
};

export const logDatabaseQuery = (query: string, duration: number, success: boolean, error?: Error) => {
  if (success) {
    logger.debug(`Database query completed in ${duration}ms`, {
      operation: 'db_query',
      component: 'database',
      metadata: { query: query.substring(0, 100), duration }
    });
  } else {
    logger.error(`Database query failed after ${duration}ms`, {
      operation: 'db_query',
      component: 'database',
      metadata: { query: query.substring(0, 100), duration }
    }, error);
  }
};

export const logExternalApiCall = (service: string, endpoint: string, duration: number, success: boolean, error?: Error) => {
  if (success) {
    logger.info(`External API call to ${service} completed in ${duration}ms`, {
      operation: 'external_api',
      component: service,
      metadata: { endpoint, duration }
    });
  } else {
    logger.error(`External API call to ${service} failed after ${duration}ms`, {
      operation: 'external_api',
      component: service,
      metadata: { endpoint, duration }
    }, error);
  }
};

export const logWorkoutGeneration = (userId: string, planType: string, duration: number, success: boolean, tokenUsage?: any, error?: Error) => {
  const context = {
    operation: 'workout_generation',
    component: 'openai',
    userId,
    metadata: { planType, duration, tokenUsage }
  };
  
  if (success) {
    logger.info(`Workout plan generated successfully in ${duration}ms`, context);
  } else {
    logger.error(`Workout plan generation failed after ${duration}ms`, context, error);
  }
};

export const logCacheOperation = (operation: string, key: string, hit: boolean, size?: number) => {
  logger.debug(`Cache ${operation}: ${key} (${hit ? 'HIT' : 'MISS'})`, {
    operation: 'cache_operation',
    component: 'cache',
    metadata: { operation, key, hit, size }
  });
};