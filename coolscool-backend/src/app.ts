import { config, validateConfig } from './config/index.js';
import { testConnection, closePool } from './config/database.js';
import { createApp } from './create-app.js';

// Validate configuration
validateConfig();

// Create Express app
const app = createApp(config.apiVersion);

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
