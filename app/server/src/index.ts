import { createApp, createLogger } from './app';
import { loadConfig } from './config';
import { lifecycle } from './controllers/system.controller';

const config = loadConfig();
const logger = createLogger(config);

if (config.orderKeyEphemeral) {
  logger.warn(
    'ORDER_SIGNING_KEY no definida: se generó una clave EFÍMERA. Cada réplica tendrá una distinta ' +
      'y los comprobantes solo se podrán verificar en el Pod que los emitió. Define la misma clave en todas las réplicas.',
  );
}

const app = createApp(config, logger);
const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      version: config.appVersion,
      env: config.appEnv,
      namespace: config.podNamespace,
    },
    'Zentinel Store iniciado',
  );
});

/** Apagado ordenado: /readyz pasa a 503, se espera a que el Service retire el Pod y se drenan conexiones. */
function shutdown(signal: string): void {
  logger.info({ signal }, 'señal recibida, iniciando apagado ordenado');
  lifecycle.shuttingDown = true;
  const grace = Number(process.env.SHUTDOWN_GRACE_MS ?? 5000);
  setTimeout(() => {
    server.close((err) => {
      if (err) {
        logger.error({ err }, 'error al cerrar el servidor');
        process.exit(1);
      }
      logger.info('servidor cerrado');
      process.exit(0);
    });
    // Si quedan conexiones colgadas, se fuerza la salida.
    setTimeout(() => process.exit(0), 10_000).unref();
  }, grace).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
