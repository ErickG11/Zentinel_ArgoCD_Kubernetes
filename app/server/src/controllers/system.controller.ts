import type { Request, Response } from 'express';
import type { Config } from '../config';
import { registry } from '../middleware/metrics';
import { systemInfo } from '../services/system';

/** Estado de apagado: /readyz devuelve 503 para que el Service retire el Pod. */
export const lifecycle = { shuttingDown: false };

export const healthz = (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
};

export const readyz = (_req: Request, res: Response) => {
  if (lifecycle.shuttingDown) {
    res.status(503).json({ status: 'shutting_down' });
    return;
  }
  res.json({ status: 'ready' });
};

export const info = (config: Config) => (_req: Request, res: Response) => {
  // Sin caché y con Connection: close, cada sondeo abre una conexión TCP nueva:
  // kube-proxy balancea por conexión, así el panel /estado ve rotar los Pods.
  res.set({ 'Cache-Control': 'no-store', Connection: 'close' });
  res.json(systemInfo(config));
};

export const metrics = async (_req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
};
