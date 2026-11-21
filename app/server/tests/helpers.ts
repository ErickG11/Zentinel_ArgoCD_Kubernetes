import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { pino } from 'pino';

export const TEST_KEY = 'test-signing-key-0123456789abcdef';

export function testApp(env: Record<string, string> = {}) {
  const config = loadConfig({
    APP_VERSION: '9.9.9',
    APP_ENV: 'test',
    POD_NAMESPACE: 'testns',
    LOG_LEVEL: 'silent',
    ORDER_SIGNING_KEY: TEST_KEY,
    WEB_DIST: '/nonexistent',
    ...env,
  });
  return { app: createApp(config, pino({ level: 'silent' })), config };
}

/** Selección completa y compatible (AM5 + DDR5 + ATX). */
export const GOOD_BUILD = {
  cpu: 'amd-ryzen-5-7600',
  motherboard: 'asus-tuf-b650-plus-wifi',
  ram: 'kingston-fury-beast-32-d5',
  gpu: 'nvidia-rtx-4060-ti',
  psu: 'corsair-rm750e',
  case: 'nzxt-h5-flow',
  cooling: 'deepcool-ak400',
  storage: ['wd-blue-sn580-1tb'],
};

export const CUSTOMER = {
  name: 'Erick Granda',
  email: 'erick@example.com',
  phone: '0991234567',
  address: 'Av. Principal 123 y Secundaria',
  city: 'Quito' as const,
};
