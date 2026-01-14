import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number, code: string = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common errors
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  details: unknown[];

  constructor(message: string = 'Validation failed', details: unknown[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

// 404 handler
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

// Global error handler
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default values
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown[] = [];

  // Handle known errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    if (err instanceof ValidationError) {
      details = err.details;
    }
  }

  // Log error
  console.error(`[${req.requestId || 'no-id'}] Error:`, {
    statusCode,
    code,
    message,
    path: req.path,
    method: req.method,
    stack: config.isDevelopment ? err.stack : undefined,
  });

  // Send response
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details.length > 0 && { details }),
      ...(config.isDevelopment && { stack: err.stack }),
    },
    requestId: req.requestId,
  });
}
