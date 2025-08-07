"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityMonitoringMiddleware = exports.apiAnalyticsMiddleware = exports.userActivityMiddleware = exports.healthCheckMiddleware = exports.rateLimitMonitoringMiddleware = exports.performanceMonitoringMiddleware = exports.errorLoggingMiddleware = exports.responseLoggingMiddleware = exports.requestLoggingMiddleware = exports.requestIdMiddleware = exports.generateRequestId = void 0;
const logger_1 = require("../utils/logger");
/**
 * Generate unique request ID for correlation
 */
const generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
exports.generateRequestId = generateRequestId;
/**
 * Request ID middleware - assigns unique ID to each request
 */
const requestIdMiddleware = (req, res, next) => {
    req.requestId = (0, exports.generateRequestId)();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
/**
 * Request logging middleware - logs incoming requests
 */
const requestLoggingMiddleware = (req, res, next) => {
    var _a, _b;
    req.startTime = Date.now();
    // Extract user ID from JWT token or session
    const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email) || 'anonymous';
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
    (0, logger_1.logApiRequest)(req.method, req.path, userId, req.requestId);
    // Log request body for non-GET requests (excluding sensitive data)
    if (req.method !== 'GET' && req.body) {
        const sanitizedBody = sanitizeRequestBody(req.body);
        if (Object.keys(sanitizedBody).length > 0) {
            logger_1.logger.debug('Request body', {
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
exports.requestLoggingMiddleware = requestLoggingMiddleware;
/**
 * Response logging middleware - logs outgoing responses
 */
const responseLoggingMiddleware = (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    // Override res.send to capture response
    res.send = function (body) {
        logResponse(req, res, body);
        return originalSend.call(this, body);
    };
    // Override res.json to capture JSON responses
    res.json = function (body) {
        logResponse(req, res, body);
        return originalJson.call(this, body);
    };
    next();
};
exports.responseLoggingMiddleware = responseLoggingMiddleware;
/**
 * Log the response details
 */
const logResponse = (req, res, responseBody) => {
    var _a;
    const duration = Date.now() - (req.startTime || Date.now());
    const userId = ((_a = req.logContext) === null || _a === void 0 ? void 0 : _a.userId) || 'anonymous';
    // Log the response
    (0, logger_1.logApiResponse)(req.method, req.path, res.statusCode, duration, userId, req.requestId);
    // Log response body for errors (sanitized)
    if (res.statusCode >= 400 && responseBody) {
        const sanitizedResponse = sanitizeResponseBody(responseBody);
        logger_1.logger.debug('Error response body', {
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
        logger_1.logger.warn(`Slow API response detected: ${req.method} ${req.path}`, {
            operation: 'slow_request',
            component: 'api',
            userId,
            requestId: req.requestId,
            metadata: { duration, statusCode: res.statusCode }
        });
    }
    // Track high error rates
    if (res.statusCode >= 500) {
        logger_1.logger.error(`Server error response: ${req.method} ${req.path}`, {
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
const errorLoggingMiddleware = (error, req, res, next) => {
    var _a;
    const duration = Date.now() - (req.startTime || Date.now());
    const userId = ((_a = req.logContext) === null || _a === void 0 ? void 0 : _a.userId) || 'anonymous';
    // Log the error with full context
    logger_1.logger.error(`Unhandled error in ${req.method} ${req.path}`, {
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
exports.errorLoggingMiddleware = errorLoggingMiddleware;
/**
 * Performance monitoring middleware
 */
const performanceMonitoringMiddleware = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    // Override res.end to capture final metrics
    const originalEnd = res.end;
    // Use function expression with proper overloads
    const newEnd = function (...args) {
        var _a, _b, _c;
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        // Log performance metrics
        logger_1.logger.debug('Request performance metrics', {
            operation: 'performance_metrics',
            component: 'api',
            userId: (_a = req.logContext) === null || _a === void 0 ? void 0 : _a.userId,
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
            logger_1.logger.warn('Extremely slow request detected', {
                operation: 'performance_alert',
                component: 'api',
                userId: (_b = req.logContext) === null || _b === void 0 ? void 0 : _b.userId,
                requestId: req.requestId,
                metadata: { duration, path: req.path, method: req.method }
            });
        }
        if (memoryDelta > 50 * 1024 * 1024) { // 50MB
            logger_1.logger.warn('High memory usage detected', {
                operation: 'memory_alert',
                component: 'api',
                userId: (_c = req.logContext) === null || _c === void 0 ? void 0 : _c.userId,
                requestId: req.requestId,
                metadata: { memoryDelta, path: req.path, method: req.method }
            });
        }
        return originalEnd.apply(this, args);
    };
    res.end = newEnd;
    next();
};
exports.performanceMonitoringMiddleware = performanceMonitoringMiddleware;
/**
 * Rate limiting monitoring middleware
 */
const rateLimitMonitoringMiddleware = (req, res, next) => {
    var _a, _b;
    // Track requests per user/IP
    const identifier = ((_a = req.logContext) === null || _a === void 0 ? void 0 : _a.userId) || req.ip || 'unknown';
    const key = `rate_limit:${identifier}`;
    // Simple in-memory rate tracking (in production, use Redis)
    const rateTracker = new Map();
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const current = rateTracker.get(key);
    if (!current || now > current.resetTime) {
        rateTracker.set(key, { count: 1, resetTime: now + windowMs });
    }
    else {
        current.count++;
        // Alert on high request rates
        if (current.count > 100) { // 100 requests per minute
            logger_1.logger.warn('High request rate detected', {
                operation: 'rate_limit_alert',
                component: 'api',
                userId: (_b = req.logContext) === null || _b === void 0 ? void 0 : _b.userId,
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
exports.rateLimitMonitoringMiddleware = rateLimitMonitoringMiddleware;
/**
 * Health check endpoint monitoring
 */
const healthCheckMiddleware = (req, res, next) => {
    if (req.path === '/api/health') {
        logger_1.logger.debug('Health check request', {
            operation: 'health_check',
            component: 'monitoring',
            requestId: req.requestId,
            metadata: { userAgent: req.get('User-Agent') }
        });
    }
    next();
};
exports.healthCheckMiddleware = healthCheckMiddleware;
/**
 * Sanitize request body to remove sensitive information
 */
const sanitizeRequestBody = (body) => {
    if (!body || typeof body !== 'object')
        return {};
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn'];
    const sanitized = { ...body };
    const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object')
            return obj;
        const result = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            const isSensitive = sensitiveFields.some(field => keyLower.includes(field));
            if (isSensitive) {
                result[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = sanitizeObject(value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    };
    return sanitizeObject(sanitized);
};
/**
 * Sanitize response body to remove sensitive information
 */
const sanitizeResponseBody = (body) => {
    if (!body)
        return body;
    try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        return sanitizeRequestBody(parsed);
    }
    catch (_a) {
        return '[UNPARSEABLE]';
    }
};
/**
 * User activity tracking middleware
 */
const userActivityMiddleware = (req, res, next) => {
    var _a;
    const userId = (_a = req.logContext) === null || _a === void 0 ? void 0 : _a.userId;
    if (userId && userId !== 'anonymous') {
        // Track user activity patterns
        logger_1.logger.info('User activity', {
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
exports.userActivityMiddleware = userActivityMiddleware;
/**
 * API usage analytics middleware
 */
const apiAnalyticsMiddleware = (req, res, next) => {
    var _a, _b;
    const isDevelopment = process.env.NODE_ENV === 'development';
    // In production, only track analytics for important endpoints or errors
    // In development, track everything for debugging
    if (isDevelopment) {
        const endpoint = `${req.method}_${req.path}`;
        logger_1.logger.debug('API usage', {
            operation: 'api_analytics',
            component: 'analytics',
            userId: (_a = req.logContext) === null || _a === void 0 ? void 0 : _a.userId,
            requestId: req.requestId,
            metadata: {
                endpoint,
                timestamp: Date.now(),
                userType: ((_b = req.logContext) === null || _b === void 0 ? void 0 : _b.userId) === 'anonymous' ? 'guest' : 'authenticated'
            }
        });
    }
    next();
};
exports.apiAnalyticsMiddleware = apiAnalyticsMiddleware;
/**
 * Security monitoring middleware
 */
const securityMonitoringMiddleware = (req, res, next) => {
    var _a, _b;
    const suspiciousPatterns = [
        /(\.\.|\.\.\\)/, // Path traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /javascript:/i // JavaScript protocol
    ];
    const checkForThreats = (value) => {
        return suspiciousPatterns.some(pattern => pattern.test(value));
    };
    // Check URL for suspicious patterns
    if (checkForThreats(req.url)) {
        logger_1.logger.warn('Suspicious request pattern detected in URL', {
            operation: 'security_alert',
            component: 'security',
            userId: (_a = req.logContext) === null || _a === void 0 ? void 0 : _a.userId,
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
            logger_1.logger.warn('Suspicious request pattern detected in body', {
                operation: 'security_alert',
                component: 'security',
                userId: (_b = req.logContext) === null || _b === void 0 ? void 0 : _b.userId,
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
exports.securityMonitoringMiddleware = securityMonitoringMiddleware;
