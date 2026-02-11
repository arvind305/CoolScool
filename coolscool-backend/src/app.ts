import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { config, validateConfig } from './config/index.js';
import { testConnection, closePool } from './config/database.js';
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

// Create Express app
const app: Express = express();

// Validate configuration
validateConfig();

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
app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/curricula`, curriculumRoutes);
app.use(`/api/${config.apiVersion}/cam`, camRoutes);  // Backwards compatible - uses default curriculum
app.use(`/api/${config.apiVersion}/sessions`, sessionRoutes);
app.use(`/api/${config.apiVersion}/progress`, progressRoutes);
app.use(`/api/${config.apiVersion}/settings`, settingsRoutes);
app.use(`/api/${config.apiVersion}/parent`, parentRoutes);
app.use(`/api/${config.apiVersion}/profile`, profileRoutes);
app.use(`/api/${config.apiVersion}/flags`, flagRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
async function startServer(): Promise<void> {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected && config.isProduction) {
      throw new Error('Database connection required in production');
    }

    // Start listening
    const server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      console.log(`API version: ${config.apiVersion}`);
      console.log(`Health check: http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('HTTP server closed');
        await closePool();
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
