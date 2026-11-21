import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { getProduct } from '../data/catalog';
import { REQUIRED_CATEGORIES, checkBuild, type Selection } from './compat';
import type { BuildCategory, Product } from '../data/types';
import { unprocessable } from '../lib/errors';
import { round2 } from '../lib/text';
import { signPayload, verifyToken, type VerifyResult } from './signing';

export const IVA_RATE = 0.15;
export const COMBO_DISCOUNT_RATE = 0.05;
export const FREE_SHIPPING_FROM = 500;

export const CITIES = [
  'Quito',
  'Guayaquil',
  'Cuenca',
  'Ambato',
  'Manta',
  'Loja',
  'Riobamba',
  'Ibarra',
  'Machala',
  'Otra ciudad',
] as const;

/** Costo de envío por ciudad (USD, antes de IVA). */
export const SHIPPING_BY_CITY: Record<(typeof CITIES)[number], number> = {
  Quito: 4.5,
  Guayaquil: 4.5,
  Cuenca: 5.5,
  Ambato: 5,
  Manta: 6,
  Loja: 6.5,
  Riobamba: 5.5,
  Ibarra: 5.5,
  Machala: 6,
  'Otra ciudad': 8,
};

export const PAYMENT_METHODS = ['transfer', 'card_sim', 'cash_on_delivery'] as const;

export const orderInputSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(3, 'Ingresa tu nombre completo').max(80),
    email: z.string().trim().email('Correo electrónico inválido').max(120),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^(\+593|0)\d{9}$/, 'Teléfono ecuatoriano inválido (ej. 0991234567)')),
    address: z.string().trim().min(8, 'Dirección demasiado corta').max(160),
    city: z.enum(CITIES),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(10),
      }),
    )
    .min(1, 'El carrito está vacío')
    .max(40),
  paymentMethod: z.enum(PAYMENT_METHODS),
});
export type OrderInput = z.infer<typeof orderInputSchema>;

export interface PricedLine {
  productId: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface Totals {
  subtotal: number;
  comboDiscount: number;
  comboApplied: boolean;
  taxableBase: number;
  shipping: number;
  iva: number;
  total: number;
}

export interface OrderPayload {
  code: string;
  issuedAt: string;
  customer: OrderInput['customer'];
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  lines: PricedLine[];
  totals: Totals;
}

/** Detecta una build completa y compatible: exactamente un producto distinto por categoría clave. */
function detectCombo(lines: PricedLine[]): { applied: boolean; base: number } {
  const byCat = new Map<BuildCategory, PricedLine[]>();
  for (const l of lines) {
    const arr = byCat.get(l.category as BuildCategory) ?? [];
    arr.push(l);
    byCat.set(l.category as BuildCategory, arr);
  }
  const sel: Selection = {};
  let base = 0;
  for (const cat of REQUIRED_CATEGORIES) {
    const group = byCat.get(cat);
    if (!group || group.length !== 1) return { applied: false, base: 0 };
    const line = group[0]!;
    base += line.unitPrice; // una unidad de cada pieza del combo
    if (cat === 'storage') sel.storage = [line.productId];
    else sel[cat] = line.productId;
  }
  const cooling = byCat.get('cooling');
  if (cooling?.length === 1) {
    sel.cooling = cooling[0]!.productId;
    base += cooling[0]!.unitPrice;
  }
  const check = checkBuild(sel);
  return check.compatible && check.complete ? { applied: true, base } : { applied: false, base: 0 };
}

/** Cálculo de precios 100 % en servidor: nunca se confía en los precios del cliente. */
export function priceOrder(
  items: OrderInput['items'],
  city: (typeof CITIES)[number],
): { lines: PricedLine[]; totals: Totals } {
  const merged = new Map<string, number>();
  for (const it of items) merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.qty);

  const lines: PricedLine[] = [];
  for (const [productId, qty] of merged) {
    const product: Product | undefined = getProduct(productId);
    if (!product) throw unprocessable(`El producto "${productId}" no existe`);
    if (qty > product.stock) {
      throw unprocessable(
        `Stock insuficiente para "${product.name}": disponibles ${product.stock}`,
      );
    }
    lines.push({
      productId,
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: product.price,
      qty,
      lineTotal: round2(product.price * qty),
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const combo = detectCombo(lines);
  const comboDiscount = combo.applied ? round2(combo.base * COMBO_DISCOUNT_RATE) : 0;
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_BY_CITY[city];
  // IVA 15 % sobre bienes (con descuento) y sobre el servicio de envío.
  const taxableBase = round2(subtotal - comboDiscount + shipping);
  const iva = round2(taxableBase * IVA_RATE);
  const total = round2(taxableBase + iva);
  return {
    lines,
    totals: {
      subtotal,
      comboDiscount,
      comboApplied: combo.applied,
      taxableBase,
      shipping,
      iva,
      total,
    },
  };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderCode(): string {
  const bytes = randomBytes(6);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `ZS-${chars}`;
}

export interface Receipt {
  code: string;
  token: string;
  order: OrderPayload;
}

export function createOrder(input: OrderInput, signingKey: string, now = new Date()): Receipt {
  const { lines, totals } = priceOrder(input.items, input.customer.city);
  const order: OrderPayload = {
    code: generateOrderCode(),
    issuedAt: now.toISOString(),
    customer: input.customer,
    paymentMethod: input.paymentMethod,
    lines,
    totals,
  };
  return { code: order.code, token: signPayload(order, signingKey), order };
}

export function verifyOrder(token: string, signingKey: string): VerifyResult<OrderPayload> {
  return verifyToken<OrderPayload>(token, signingKey);
}
