import { describe, expect, it } from 'vitest';
import { createOrder, priceOrder, verifyOrder, IVA_RATE } from '../src/services/orders';
import { signPayload, verifyToken } from '../src/services/signing';
import { CUSTOMER, GOOD_BUILD, TEST_KEY } from './helpers';

const buildItems = [
  GOOD_BUILD.cpu,
  GOOD_BUILD.motherboard,
  GOOD_BUILD.ram,
  GOOD_BUILD.gpu,
  GOOD_BUILD.psu,
  GOOD_BUILD.case,
  GOOD_BUILD.cooling,
  ...GOOD_BUILD.storage,
].map((productId) => ({ productId, qty: 1 }));

describe('cálculo de pedidos', () => {
  it('calcula subtotal, envío e IVA 15 % (pedido pequeño)', () => {
    const { totals } = priceOrder([{ productId: 'usbc-100w-1m', qty: 2 }], 'Quito');
    expect(totals.subtotal).toBe(24);
    expect(totals.shipping).toBe(4.5);
    expect(totals.iva).toBeCloseTo((24 + 4.5) * IVA_RATE, 2);
    expect(totals.total).toBeCloseTo(28.5 * 1.15, 2);
    expect(totals.comboApplied).toBe(false);
  });

  it('envío gratis desde $500 y varía por ciudad', () => {
    expect(priceOrder([{ productId: 'amd-ryzen-7-7800x3d', qty: 2 }], 'Loja').totals.shipping).toBe(
      0,
    );
    expect(priceOrder([{ productId: 'usbc-100w-1m', qty: 1 }], 'Loja').totals.shipping).toBe(6.5);
  });

  it('aplica 5 % de descuento por combo si el pedido es una build completa compatible', () => {
    const { totals } = priceOrder(buildItems, 'Guayaquil');
    expect(totals.comboApplied).toBe(true);
    expect(totals.comboDiscount).toBeCloseTo(totals.subtotal * 0.05, 2);
    expect(totals.taxableBase).toBeCloseTo(
      totals.subtotal - totals.comboDiscount + totals.shipping,
      2,
    );
  });

  it('no aplica combo si la build es incompatible', () => {
    const bad = buildItems.map((i) =>
      i.productId === GOOD_BUILD.cpu ? { productId: 'intel-core-i5-13600k', qty: 1 } : i,
    );
    expect(priceOrder(bad, 'Quito').totals.comboApplied).toBe(false);
  });

  it('valida producto inexistente y stock insuficiente', () => {
    expect(() => priceOrder([{ productId: 'x', qty: 1 }], 'Quito')).toThrow(/no existe/);
    expect(() => priceOrder([{ productId: 'amd-ryzen-9-7950x', qty: 10 }], 'Quito')).toThrow(
      /Stock insuficiente/,
    );
  });
});

describe('comprobante firmado', () => {
  const receipt = createOrder(
    {
      customer: CUSTOMER,
      items: [{ productId: 'logitech-g203', qty: 1 }],
      paymentMethod: 'transfer',
    },
    TEST_KEY,
  );

  it('genera código ZS-XXXXXX', () => {
    expect(receipt.code).toMatch(/^ZS-[A-Z2-9]{6}$/);
  });

  it('verifica un token válido y devuelve el pedido completo', () => {
    const r = verifyOrder(receipt.token, TEST_KEY);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.data.code).toBe(receipt.code);
      expect(r.data.totals.total).toBe(receipt.order.totals.total);
    }
  });

  it('rechaza un token alterado', () => {
    const [payload, sig] = receipt.token.split('.') as [string, string];
    const tampered = Buffer.from(
      JSON.stringify({ ...receipt.order, totals: { ...receipt.order.totals, total: 1 } }),
    ).toString('base64url');
    expect(verifyOrder(`${tampered}.${sig}`, TEST_KEY)).toMatchObject({
      valid: false,
      reason: 'SIGNATURE',
    });
    expect(payload.length).toBeGreaterThan(10);
  });

  it('rechaza un token firmado con otra clave y formatos inválidos', () => {
    const other = signPayload({ a: 1 }, 'otra-clave-distinta-1234567890');
    expect(verifyToken(other, TEST_KEY)).toMatchObject({ valid: false, reason: 'SIGNATURE' });
    expect(verifyToken('basura', TEST_KEY)).toMatchObject({ valid: false, reason: 'FORMAT' });
  });
});
