import { Request, Response, NextFunction } from 'express';
import Joi, { Schema, ValidationError as JoiValidationError } from 'joi';
import { ValidationError } from './error.js';

type RequestProperty = 'body' | 'query' | 'params';

// Validation middleware factory
export function validate(
  schema: Schema,
  property: RequestProperty = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return next(new ValidationError('Validation failed', details));
    }

    // Replace with validated (and sanitized) value
    req[property] = value;
    next();
  };
}

// Common validation schemas
export const schemas = {
  // Auth schemas
  googleAuth: Joi.object({
    idToken: Joi.string().required().messages({
      'string.empty': 'Google ID token is required',
      'any.required': 'Google ID token is required',
    }),
    deviceInfo: Joi.object({
      platform: Joi.string().max(50),
      version: Joi.string().max(50),
      userAgent: Joi.string().max(500),
    }).optional(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
  }),

  // Session schemas
  createSession: Joi.object({
    curriculumId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'Curriculum ID must be a valid UUID',
        'any.required': 'Curriculum ID is required',
      }),
    topicId: Joi.string()
      .pattern(/^T\d{2}\.\d{2}$/)
      .required()
      .messages({
        'string.pattern.base': 'Topic ID must be in format T##.##',
        'any.required': 'Topic ID is required',
      }),
    timeMode: Joi.string()
      .valid('unlimited', '10min', '5min', '3min')
      .default('unlimited'),
    questionCount: Joi.number().integer().min(1).max(50).default(10),
    strategy: Joi.string()
      .valid('adaptive', 'sequential', 'random', 'review')
      .default('adaptive'),
  }),

  submitAnswer: Joi.object({
    userAnswer: Joi.alternatives()
      .try(
        Joi.string().max(500),
        Joi.boolean(),
        Joi.array().items(Joi.string().max(200)).max(20),
        Joi.object().pattern(Joi.string(), Joi.string().max(200))
      )
      .required()
      .messages({
        'any.required': 'Answer is required',
      }),
    timeTakenMs: Joi.number().integer().min(0).max(3600000).default(0),
  }),

  // Progress schemas
  importProgress: Joi.object({
    exportData: Joi.object().required(),
    merge: Joi.boolean().default(false),
  }),

  resetProgress: Joi.object({
    confirm: Joi.string().valid('RESET_ALL_PROGRESS').required().messages({
      'any.only': 'Must confirm with "RESET_ALL_PROGRESS"',
      'any.required': 'Confirmation required',
    }),
  }),

  // Pagination
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }),

  // UUID parameter
  uuidParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  sessionIdParam: Joi.object({
    sessionId: Joi.string().uuid().required(),
  }),
};
