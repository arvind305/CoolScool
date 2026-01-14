import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Stricter limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again later.',
    retryAfter: 3600,
  },
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Quiz session limiter - more permissive
export const quizLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (allows fast answering)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many quiz requests. Please slow down.',
    retryAfter: 60,
  },
});

// Question fetch limiter - prevents scraping
export const questionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 questions per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many question requests. Please slow down.',
    retryAfter: 60,
  },
});

// Export limiter - very strict
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 exports per hour
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Export limit reached. Please try again later.',
    retryAfter: 3600,
  },
});
