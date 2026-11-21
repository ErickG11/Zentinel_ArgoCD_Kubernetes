import { SPEC_META } from '../data/categories';
import type { Product, SpecValue } from '../data/types';
import { badRequest, unprocessable } from '../lib/errors';
import { getProductOrThrow } from './catalog.service';

export type Rank = 'best' | 'worst' | 'neutral';

export interface CompareRow {
  key: string;
  label: string;
  unit?: string;
  better?: 'higher' | 'lower';
  values: { productId: string; value: SpecValue | null; rank: Rank }[];
  /** true si todos los valores son iguales. */
  identical: boolean;
}

export interface CompareResult {
  category: string;
  products: Product[];
  rows: CompareRow[];
  /** Producto con más "mejores" valores. */
  winnerId: string | null;
}

/** Asigna best/worst entre valores numéricos; los empates y valores iguales son neutrales. */
function rankValues(values: (number | null)[], better: 'higher' | 'lower'): Rank[] {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return values.map(() => 'neutral');
  const best = better === 'higher' ? Math.max(...nums) : Math.min(...nums);
  const worst = better === 'higher' ? Math.min(...nums) : Math.max(...nums);
  if (best === worst) return values.map(() => 'neutral');
  return values.map((v) => (v === best ? 'best' : v === worst ? 'worst' : 'neutral'));
}

export function compareProducts(ids: string[]): CompareResult {
  const unique = [...new Set(ids)];
  if (unique.length < 2)
    throw badRequest('Se necesitan al menos 2 productos distintos para comparar');
  if (unique.length > 4) throw badRequest('Se pueden comparar como máximo 4 productos');
  const products = unique.map(getProductOrThrow);
  const category = products[0]!.category;
  if (products.some((p) => p.category !== category)) {
    throw unprocessable('Solo se pueden comparar productos de la misma categoría');
  }

  const meta = SPEC_META[category] ?? {};
  const keys = [
    ...new Set([...Object.keys(meta), ...products.flatMap((p) => Object.keys(p.specs))]),
  ];

  const rows: CompareRow[] = [];

  const pushRow = (
    key: string,
    label: string,
    raw: (SpecValue | null)[],
    better?: 'higher' | 'lower',
    unit?: string,
  ) => {
    const nums = raw.map((v) => (typeof v === 'number' ? v : null));
    const ranks = better && nums.every((v) => v !== null) ? rankValues(nums, better) : null;
    const row: CompareRow = {
      key,
      label,
      values: products.map((p, i) => ({
        productId: p.id,
        value: raw[i] ?? null,
        rank: ranks?.[i] ?? 'neutral',
      })),
      identical: new Set(raw.map((v) => JSON.stringify(v))).size === 1,
    };
    if (unit) row.unit = unit;
    if (better) row.better = better;
    rows.push(row);
  };

  pushRow(
    'price',
    'Precio',
    products.map((p) => p.price),
    'lower',
    'USD',
  );
  pushRow(
    'rating',
    'Valoración',
    products.map((p) => p.rating),
    'higher',
    '/5',
  );
  for (const key of keys) {
    const m = meta[key];
    pushRow(
      key,
      m?.label ?? key,
      products.map((p) => p.specs[key] ?? null),
      m?.better,
      m?.unit,
    );
  }

  const wins = new Map<string, number>();
  for (const row of rows) {
    for (const v of row.values)
      if (v.rank === 'best') wins.set(v.productId, (wins.get(v.productId) ?? 0) + 1);
  }
  const sorted = [...wins].sort((a, b) => b[1] - a[1]);
  const winnerId = sorted[0] && (!sorted[1] || sorted[0][1] > sorted[1][1]) ? sorted[0][0] : null;

  return { category, products, rows, winnerId };
}
