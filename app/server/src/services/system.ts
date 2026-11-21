import os from 'node:os';
import type { Config } from '../config';

/** Contador de peticiones del Pod (en memoria: cada réplica cuenta las suyas). */
let requests = 0;
export const countRequest = (): number => ++requests;
export const resetRequestCount = (): void => {
  requests = 0;
};

const startedAt = Date.now();

export function systemInfo(config: Config) {
  return {
    pod: os.hostname(),
    version: config.appVersion,
    environment: config.appEnv,
    namespace: config.podNamespace,
    commit: config.gitCommit,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    startedAt: new Date(startedAt).toISOString(),
    requestsServed: requests,
    node: process.version,
    timestamp: new Date().toISOString(),
  };
}
