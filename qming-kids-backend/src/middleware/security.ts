import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import { Express, Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export function setupSecurityMiddleware(app: Express): void {
  // Helmet security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow OAuth
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // CORS configuration
  const corsOptions = {
    origin: config.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
  };
  app.use(cors(corsOptions));

  // Prevent HTTP Parameter Pollution
  app.use(hpp());

  // Compression
  app.use(compression());

  // Disable X-Powered-By header
  app.disable('x-powered-by');

  // Trust proxy (for Render/Vercel)
  app.set('trust proxy', 1);
}

// Request ID middleware for tracing
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId as string;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
