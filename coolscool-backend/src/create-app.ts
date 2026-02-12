import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { setupSecurityMiddleware, requestIdMiddleware } from './middleware/security.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.routes.js';
import curriculumRoutes from './routes/curriculum.routes.js';
import camRoutes from './routes/cam.routes.js';
import sessionRoutes from './routes/session.routes.js';
import progressRoutes from './routes/progress.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import parentRoutes from './routes/parent.routes.js';
import profileRoutes from './routes/profile.routes.js';
import flagRoutes from './routes/flag.routes.js';

/**
 * Creates and configures the Express app without starting the server.
 * Used by both app.ts (production) and tests.
 */
export function createApp(apiVersion: string = 'v1'): Express {
  const app = express();

  // Setup security middleware
  setupSecurityMiddleware(app);

  // Request ID for tracing
  app.use(requestIdMiddleware);

  // Global rate limiting
  app.use(globalLimiter);

  // Cookie parsing
  app.use(cookieParser());

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Routes
  app.use('/health', healthRoutes);

  // API routes
  app.use(`/api/${apiVersion}/auth`, authRoutes);
  app.use(`/api/${apiVersion}/curricula`, curriculumRoutes);
  app.use(`/api/${apiVersion}/cam`, camRoutes);
  app.use(`/api/${apiVersion}/sessions`, sessionRoutes);
  app.use(`/api/${apiVersion}/progress`, progressRoutes);
  app.use(`/api/${apiVersion}/settings`, settingsRoutes);
  app.use(`/api/${apiVersion}/parent`, parentRoutes);
  app.use(`/api/${apiVersion}/profile`, profileRoutes);
  app.use(`/api/${apiVersion}/flags`, flagRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
