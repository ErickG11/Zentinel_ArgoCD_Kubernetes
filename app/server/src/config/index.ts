import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

/** Booleano desde variable de entorno ("true"/"false"). */
const boolEnv = (def: boolean) =>
  z
    .enum(['true', 'false'])
    .default(def ? 'true' : 'false')
    .transform((v) => v === 'true');

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ENV: z.string().default('development'),
  APP_VERSION: z.string().default('dev'),
  GIT_COMMIT: z.string().default('unknown'),
  POD_NAMESPACE: z.string().default('local'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RATE_LIMIT_ENABLED: boolEnv(false),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(600),
  RECOMMEND_MAX_COMBINATIONS: z.coerce.number().int().min(100).max(5_000_000).default(50_000),
  ORDER_SIGNING_KEY: z.string().min(16).optional(),
  WEB_DIST: z.string().optional(),
});

export interface Config {
  port: number;
  appEnv: string;
  appVersion: string;
  gitCommit: string;
  podNamespace: string;
  logLevel: string;
  rateLimitEnabled: boolean;
  rateLimitMax: number;
  recommendMaxCombinations: number;
  /** Clave HMAC con la que se firman los comprobantes de pedido. */
  orderSigningKey: string;
  /** true si la clave se generó en memoria (distinta en cada réplica). */
  orderKeyEphemeral: boolean;
  webDist: string;
}

/** Carga y valida la configuración tipada desde variables de entorno. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${detail}`);
  }
  const e = parsed.data;
  return {
    port: e.PORT,
    appEnv: e.APP_ENV,
    appVersion: e.APP_VERSION,
    gitCommit: e.GIT_COMMIT,
    podNamespace: e.POD_NAMESPACE,
    logLevel: e.LOG_LEVEL,
    rateLimitEnabled: e.RATE_LIMIT_ENABLED,
    rateLimitMax: e.RATE_LIMIT_MAX,
    recommendMaxCombinations: e.RECOMMEND_MAX_COMBINATIONS,
    orderSigningKey: e.ORDER_SIGNING_KEY ?? randomBytes(32).toString('hex'),
    orderKeyEphemeral: e.ORDER_SIGNING_KEY === undefined,
    webDist: e.WEB_DIST ?? path.resolve(__dirname, '../../../web/dist'),
  };
}
