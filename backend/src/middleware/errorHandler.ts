import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string,
    public technicalMessage?: string,
    public isOperational: boolean = true
  ) {
    super(technicalMessage || userMessage);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createAppError = (
  statusCode: number,
  userMessage: string,
  technicalMessage?: string
): AppError => {
  return new AppError(statusCode, userMessage, technicalMessage);
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // Log error
  logger.error('Error occurred:', {
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
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    userMessage = 'Invalid data provided';
  } else if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
    statusCode = 401;
    userMessage = 'Authentication required';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    userMessage = 'Invalid ID format';
  } else if (error.message.includes('duplicate key')) {
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

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(
    404,
    'Resource not found',
    `Route ${req.method} ${req.originalUrl} not found`
  );
  next(error);
};