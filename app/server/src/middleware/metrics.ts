import type { RequestHandler } from 'express';
import client from 'prom-client';
import { countRequest } from '../services/system';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

/** Mide cada petición y la cuenta para /system/info. */
export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const end = httpDuration.startTimer();
  // Las sondas del kubelet y el scraping de /metrics no cuentan como tráfico de usuarios.
  if (req.path.startsWith('/api')) countRequest();
  res.on('finish', () => {
    // route.path evita cardinalidad infinita (usa el patrón, no la URL real).
    const route = req.route ? `${req.baseUrl}${(req.route as { path: string }).path}` : 'unmatched';
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
};
