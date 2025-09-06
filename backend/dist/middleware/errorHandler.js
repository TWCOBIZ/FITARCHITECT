"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.asyncHandler = exports.createAppError = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(statusCode, userMessage, technicalMessage, isOperational = true) {
        super(technicalMessage || userMessage);
        this.statusCode = statusCode;
        this.userMessage = userMessage;
        this.technicalMessage = technicalMessage;
        this.isOperational = isOperational;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const createAppError = (statusCode, userMessage, technicalMessage) => {
    return new AppError(statusCode, userMessage, technicalMessage);
};
exports.createAppError = createAppError;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const errorHandler = (err, req, res, next) => {
    let error = err;
    // Log error
    logger_1.logger.error('Error occurred:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    // Default error response
    let statusCode = 500;
    let userMessage = 'Something went wrong. Please try again.';
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        userMessage = error.userMessage;
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        userMessage = 'Invalid data provided';
    }
    else if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
        statusCode = 401;
        userMessage = 'Authentication required';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        userMessage = 'Invalid ID format';
    }
    else if (error.message.includes('duplicate key')) {
        statusCode = 409;
        userMessage = 'This record already exists';
    }
    // Send error response
    res.status(statusCode).json({
        success: false,
        error: userMessage,
        requestId: req.headers['x-request-id'],
        ...(process.env.NODE_ENV === 'development' && {
            technicalMessage: error.message,
            stack: error.stack
        })
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
    const error = new AppError(404, 'Resource not found', `Route ${req.method} ${req.originalUrl} not found`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
