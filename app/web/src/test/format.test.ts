import { describe, expect, it } from 'vitest';
import { formatPrice, formatSpec, formatUptime } from '../lib/format';
import { validateCustomer } from '../pages/Checkout';

describe('formato', () => {
  it('formatea precios en USD', () => {
    expect(formatPrice(1299)).toBe('$1,299.00');
  });

  it('formatea specs con unidades, listas y booleanos', () => {
    expect(formatSpec(16, 'GB')).toBe('16 GB');
    expect(formatSpec(['ATX', 'mATX'])).toBe('ATX, mATX');
    expect(formatSpec(true)).toBe('Sí');
    expect(formatSpec(null)).toBe('—');
  });

  it('formatea el uptime', () => {
    expect(formatUptime(42)).toBe('42 s');
    expect(formatUptime(125)).toBe('2 min 5 s');
    expect(formatUptime(7500)).toBe('2 h 5 min');
  });
});

describe('validación de checkout', () => {
  const ok = {
    name: 'Erick Granda',
    email: 'e@x.com',
    phone: '0991234567',
    address: 'Av. Principal 123',
    city: 'Quito',
  };
  it('acepta datos válidos', () => expect(validateCustomer(ok)).toEqual({}));
  it('rechaza correo, teléfono y dirección inválidos', () => {
    const e = validateCustomer({ ...ok, email: 'x', phone: '123', address: 'abc', name: 'E' });
    expect(Object.keys(e).sort()).toEqual(['address', 'email', 'name', 'phone']);
  });
});
