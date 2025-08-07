/**
 * Logging Middleware for Express.js
 * 
 * Provides automatic logging for:
 * - HTTP requests and responses
 * - Performance monitoring
 * - Error tracking and correlation
 * - User activity tracking
 * - API usage analytics
 */

import { Request, Response, NextFunction } from 'express';
import { logger, logApiRequest, logApiResponse } from '../utils/logger';

// Extend Request interface to include logging context
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
      logContext?: {
        userId?: string;
        operation?: string;
        metadata?: Record<string, any>;
      };
    }
  }
}

/**
 * Generate unique request ID for correlation
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Request ID middleware - assigns unique ID to each request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

/**
 * Request logging middleware - logs incoming requests
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.startTime = Date.now();
  
  // Extract user ID from JWT token or session
  const userId = (req as any).user?.userId || (req as any).user?.email || 'anonymous';
  
  // Set up logging context
  req.logContext = {
    userId,
    operation: `${req.method}_${req.path}`,
    metadata: {
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      contentLength: req.get('Content-Length'),
      contentType: req.get('Content-Type')
    }
  };

  // Log the incoming request
  logApiRequest(req.method, req.path, userId, req.requestId);
  
  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    if (Object.keys(sanitizedBody).length > 0) {
      logger.debug('Request body', {
        operation: 'api_request_body',
        component: 'api',
        userId,
        requestId: req.requestId,
        metadata: { body: sanitizedBody }
      });
    }
  }

  next();
};

/**
 * Response logging middleware - logs outgoing responses
 */
export const responseLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override res.send to capture response
  res.send = function(body: any) {
    logResponse(req, res, body);
    return originalSend.call(this, body);
  };
  
  // Override res.json to capture JSON responses
  res.json = function(body: any) {
    logResponse(req, res, body);
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Log the response details
 */
const logResponse = (req: Request, res: Response, responseBody?: any): void => {
  const duration = Date.now() - (req.startTime || Date.now());
  const userId = req.logContext?.userId || 'anonymous';
  
  // Log the response
  logApiResponse(req.method, req.path, res.statusCode, duration, userId, req.requestId);
  
  // Log response body for errors (sanitized)
  if (res.statusCode >= 400 && responseBody) {
    const sanitizedResponse = sanitizeResponseBody(responseBody);
    logger.debug('Error response body', {
      operation: 'api_error_response',
      component: 'api',
      userId,
      requestId: req.requestId,
      metadata: { 
        statusCode: res.statusCode,
        response: sanitizedResponse,
        duration
      }
    });
  }
  
  // Track slow requests
  if (duration > 5000) { // 5 seconds
    logger.warn(`Slow API response detected: ${req.method} ${req.path}`, {
      operation: 'slow_request',
      component: 'api',
      userId,
      requestId: req.requestId,
      metadata: { duration, statusCode: res.statusCode }
    });
  }
  
  // Track high error rates
  if (res.statusCode >= 500) {
    logger.error(`Server error response: ${req.method} ${req.path}`, {
      operation: 'server_error',
      component: 'api',
      userId,
      requestId: req.requestId,
      metadata: { statusCode: res.statusCode, duration }
    });
  }
};

/**
 * Error logging middleware - captures and logs errors
 */
export const errorLoggingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const duration = Date.now() - (req.startTime || Date.now());
  const userId = req.logContext?.userId || 'anonymous';
  
  // Log the error with full context
  logger.error(`Unhandled error in ${req.method} ${req.path}`, {
    operation: 'unhandled_error',
    component: 'api',
    userId,
    requestId: req.requestId,
    metadata: {
      statusCode: res.statusCode || 500,
      duration,
      errorType: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }, error);
  
  next(error);
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  // Override res.end to capture final metrics
  const originalEnd = res.end;
  // Use function expression with proper overloads
  const newEnd: typeof res.end = function(this: Response, ...args: any[]): Response {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    // Log performance metrics
    logger.debug('Request performance metrics', {
      operation: 'performance_metrics',
      component: 'api',
      userId: req.logContext?.userId,
      requestId: req.requestId,
      metadata: {
        duration,
        memoryDelta,
        statusCode: res.statusCode,
        path: req.path,
        method: req.method
      }
    });
    
    // Alert on performance issues
    if (duration > 10000) { // 10 seconds
      logger.warn('Extremely slow request detected', {
        operation: 'performance_alert',
        component: 'api',
        userId: req.logContext?.userId,
        requestId: req.requestId,
        metadata: { duration, path: req.path, method: req.method }
      });
    }
    
    if (memoryDelta > 50 * 1024 * 1024) { // 50MB
      logger.warn('High memory usage detected', {
        operation: 'memory_alert',
        component: 'api',
        userId: req.logContext?.userId,
        requestId: req.requestId,
        metadata: { memoryDelta, path: req.path, method: req.method }
      });
    }
    
    return originalEnd.apply(this, args as any);
  };
  
  res.end = newEnd;
  
  next();
};

/**
 * Rate limiting monitoring middleware
 */
export const rateLimitMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Track requests per user/IP
  const identifier = req.logContext?.userId || req.ip || 'unknown';
  const key = `rate_limit:${identifier}`;
  
  // Simple in-memory rate tracking (in production, use Redis)
  const rateTracker = new Map<string, { count: number; resetTime: number }>();
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  
  const current = rateTracker.get(key);
  if (!current || now > current.resetTime) {
    rateTracker.set(key, { count: 1, resetTime: now + windowMs });
  } else {
    current.count++;
    
    // Alert on high request rates
    if (current.count > 100) { // 100 requests per minute
      logger.warn('High request rate detected', {
        operation: 'rate_limit_alert',
        component: 'api',
        userId: req.logContext?.userId,
        requestId: req.requestId,
        metadata: { 
          requestCount: current.count,
          identifier,
          path: req.path,
          method: req.method
        }
      });
    }
  }
  
  next();
};

/**
 * Health check endpoint monitoring
 */
export const healthCheckMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/api/health') {
    logger.debug('Health check request', {
      operation: 'health_check',
      component: 'monitoring',
      requestId: req.requestId,
      metadata: { userAgent: req.get('User-Agent') }
    });
  }
  next();
};

/**
 * Sanitize request body to remove sensitive information
 */
const sanitizeRequestBody = (body: any): any => {
  if (!body || typeof body !== 'object') return {};
  
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn'];
  const sanitized = { ...body };
  
  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => keyLower.includes(field));
      
      if (isSensitive) {
        (result as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (result as any)[key] = sanitizeObject(value);
      } else {
        (result as any)[key] = value;
      }
    }
    
    return result;
  };
  
  return sanitizeObject(sanitized);
};

/**
 * Sanitize response body to remove sensitive information
 */
const sanitizeResponseBody = (body: any): any => {
  if (!body) return body;
  
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    return sanitizeRequestBody(parsed);
  } catch {
    return '[UNPARSEABLE]';
  }
};

/**
 * User activity tracking middleware
 */
export const userActivityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.logContext?.userId;
  
  if (userId && userId !== 'anonymous') {
    // Track user activity patterns
    logger.info('User activity', {
      operation: 'user_activity',
      component: 'analytics',
      userId,
      requestId: req.requestId,
      metadata: {
        action: `${req.method}_${req.path}`,
        timestamp: Date.now(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    });
  }
  
  next();
};

/**
 * API usage analytics middleware
 */
export const apiAnalyticsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // In production, only track analytics for important endpoints or errors
  // In development, track everything for debugging
  if (isDevelopment) {
    const endpoint = `${req.method}_${req.path}`;
    
    logger.debug('API usage', {
      operation: 'api_analytics',
      component: 'analytics',
      userId: req.logContext?.userId,
      requestId: req.requestId,
      metadata: {
        endpoint,
        timestamp: Date.now(),
        userType: req.logContext?.userId === 'anonymous' ? 'guest' : 'authenticated'
      }
    });
  }
  
  next();
};

/**
 * Security monitoring middleware
 */
export const securityMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    /(\.\.|\.\.\\)/,    // Path traversal
    /<script/i,         // XSS attempts
    /union.*select/i,   // SQL injection
    /javascript:/i      // JavaScript protocol
  ];
  
  const checkForThreats = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };
  
  // Check URL for suspicious patterns
  if (checkForThreats(req.url)) {
    logger.warn('Suspicious request pattern detected in URL', {
      operation: 'security_alert',
      component: 'security',
      userId: req.logContext?.userId,
      requestId: req.requestId,
      metadata: { 
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  }
  
  // Check request body for suspicious patterns
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    if (checkForThreats(bodyString)) {
      logger.warn('Suspicious request pattern detected in body', {
        operation: 'security_alert',
        component: 'security',
        userId: req.logContext?.userId,
        requestId: req.requestId,
        metadata: { 
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          bodySnippet: bodyString.substring(0, 200)
        }
      });
    }
  }
  
  next();
};