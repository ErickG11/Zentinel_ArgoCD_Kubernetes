import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pino, type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { Config } from './config';
import * as system from './controllers/system.controller';
import { errorHandler, notFoundHandler } from './middleware/error';
import { metricsMiddleware } from './middleware/metrics';
import { apiRouter } from './routes';

export function createLogger(config: Config): Logger {
  return pino({ level: config.logLevel, base: { app: 'zentinel-store' } });
}

export function createApp(config: Config, logger: Logger = createLogger(config)): Express {
  const app = express();
  app.disable('x-powered-by');
  // Detrás del Service/ingress: respeta X-Forwarded-For para el rate limit.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use((req, res, next) => {
    // Request-id: se respeta el del cliente si llega, o se genera uno.
    req.id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as { id?: string }).id ?? randomUUID(),
      autoLogging: { ignore: (req) => ['/healthz', '/readyz', '/metrics'].includes(req.url ?? '') },
    }),
  );
  app.use(metricsMiddleware);
  app.use(express.json({ limit: '100kb' }));

  // Sondas y métricas (fuera de /api y sin rate limit para no romper kubelet/Prometheus).
  app.get('/healthz', system.healthz);
  app.get('/readyz', system.readyz);
  app.get('/metrics', system.metrics);

  if (config.rateLimitEnabled) {
    app.use(
      '/api',
      rateLimit({
        windowMs: 60_000,
        limit: config.rateLimitMax,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: (req, res) => {
          res.status(429).json({
            error: {
              code: 'RATE_LIMITED',
              message: 'Demasiadas solicitudes, intenta en un minuto',
              requestId: req.id,
            },
          });
        },
      }),
    );
  }

  app.use('/api', apiRouter(config));
  app.use('/api', notFoundHandler);

  // Frontend compilado (producción) con fallback SPA que NO pisa /api ni las sondas.
  const indexHtml = path.join(config.webDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(config.webDist, { maxAge: '1h', index: false }));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
