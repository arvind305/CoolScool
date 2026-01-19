import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Security
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Question Encryption
  questionEncryptionKey: process.env.QUESTION_ENCRYPTION_KEY || '',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Derived
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;

// Validate required environment variables in production
export function validateConfig(): void {
  const requiredInProduction = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  if (config.isProduction) {
    const missing = requiredInProduction.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  // Validate Google OAuth Client ID format (in all environments if set)
  const googleClientId = config.google.clientId;
  if (googleClientId) {
    const validGoogleClientIdPattern = /^[\w-]+\.apps\.googleusercontent\.com$/;
    if (!validGoogleClientIdPattern.test(googleClientId)) {
      throw new Error(
        `Invalid GOOGLE_CLIENT_ID format. Expected format: "<client-id>.apps.googleusercontent.com". ` +
        `Got: "${googleClientId.substring(0, 20)}${googleClientId.length > 20 ? '...' : ''}". ` +
        `Please verify your Google Cloud Console credentials.`
      );
    }
    console.log(`✓ Google OAuth Client ID configured (${googleClientId.substring(0, 15)}...)`);
  } else if (config.isProduction) {
    throw new Error('GOOGLE_CLIENT_ID is required in production but not set');
  } else {
    console.warn('⚠ GOOGLE_CLIENT_ID not set - Google OAuth will not work');
  }
}
