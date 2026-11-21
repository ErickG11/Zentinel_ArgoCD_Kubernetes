import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Firma de comprobantes SIN base de datos: el token contiene el pedido completo
 * (base64url) más un HMAC-SHA256. Cualquier réplica con la misma clave puede
 * validarlo, que es lo que permite escalar horizontalmente sin estado compartido.
 * El token está firmado (integridad), no cifrado: no incluye datos sensibles de pago.
 */

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

function hmac(payload: string, key: string): Buffer {
  return createHmac('sha256', key).update(payload).digest();
}

export function signPayload(data: unknown, key: string): string {
  const payload = b64(JSON.stringify(data));
  return `${payload}.${b64(hmac(payload, key))}`;
}

export type VerifyResult<T> =
  { valid: true; data: T } | { valid: false; reason: 'FORMAT' | 'SIGNATURE' | 'PAYLOAD' };

export function verifyToken<T>(token: string, key: string): VerifyResult<T> {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { valid: false, reason: 'FORMAT' };
  const [payload, signature] = parts as [string, string];
  const expected = hmac(payload, key);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { valid: false, reason: 'SIGNATURE' };
  }
  try {
    return {
      valid: true,
      data: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T,
    };
  } catch {
    return { valid: false, reason: 'PAYLOAD' };
  }
}
