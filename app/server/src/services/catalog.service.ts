import { catalog, getProduct } from '../data/catalog';
import { CATEGORIES } from '../data/categories';
import type { CategorySlug, Product } from '../data/types';
import { notFound } from '../lib/errors';
import { didYouMean, searchProducts } from './search';

export type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'name';

export interface ProductQuery {
  q?: string;
  category?: CategorySlug;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  sort: SortKey;
  page: number;
  pageSize: number;
}

export interface Facets {
  brands: { name: string; count: number }[];
  categories: { slug: CategorySlug; name: string; count: number }[];
  priceRange: { min: number; max: number };
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: Facets;
  didYouMean?: string;
}

function buildFacets(pool: Product[]): Facets {
  const brands = new Map<string, number>();
  const cats = new Map<CategorySlug, number>();
  let min = Infinity;
  let max = 0;
  for (const p of pool) {
    brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);
    cats.set(p.category, (cats.get(p.category) ?? 0) + 1);
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
  }
  return {
    brands: [...brands].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    categories: CATEGORIES.filter((c) => cats.has(c.slug)).map((c) => ({
      slug: c.slug,
      name: c.name,
      count: cats.get(c.slug) ?? 0,
    })),
    priceRange: { min: Number.isFinite(min) ? Math.floor(min) : 0, max: Math.ceil(max) },
  };
}

export function listProducts(query: ProductQuery): ProductPage {
  const hasQuery = Boolean(query.q && query.q.trim());
  const scores = new Map<string, number>();
  let pool: Product[] = [...catalog];
  if (hasQuery) {
    const hits = searchProducts(query.q!);
    hits.forEach((h) => scores.set(h.product.id, h.score));
    pool = hits.map((h) => h.product);
  }
  // Las facetas se calculan sobre los resultados de la búsqueda (antes de filtrar).
  const facets = buildFacets(pool);

  const brandSet = query.brand?.length ? new Set(query.brand.map((b) => b.toLowerCase())) : null;
  let filtered = pool.filter(
    (p) =>
      (!query.category || p.category === query.category) &&
      (!brandSet || brandSet.has(p.brand.toLowerCase())) &&
      (query.minPrice === undefined || p.price >= query.minPrice) &&
      (query.maxPrice === undefined || p.price <= query.maxPrice) &&
      (!query.inStock || p.stock > 0) &&
      (query.rating === undefined || p.rating >= query.rating),
  );

  const sorters: Record<SortKey, (a: Product, b: Product) => number> = {
    relevance: (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || b.rating - a.rating,
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating || a.price - b.price,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  // Sin consulta, "relevance" equivale a mejor valoración.
  const sorter = query.sort === 'relevance' && !hasQuery ? sorters.rating : sorters[query.sort];
  filtered = [...filtered].sort(sorter);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const items = filtered.slice((page - 1) * query.pageSize, page * query.pageSize);
  const result: ProductPage = { items, total, page, pageSize: query.pageSize, totalPages, facets };
  if (hasQuery && total === 0) {
    const dym = didYouMean(query.q!);
    if (dym) result.didYouMean = dym;
  }
  return result;
}

export function getProductOrThrow(id: string): Product {
  const product = getProduct(id);
  if (!product) throw notFound('Producto');
  return product;
}

/** Relacionados: misma categoría, ordenados por cercanía de precio y rating. */
export function relatedProducts(id: string, limit = 4): Product[] {
  const base = getProductOrThrow(id);
  return catalog
    .filter((p) => p.category === base.category && p.id !== base.id)
    .sort(
      (a, b) =>
        Math.abs(a.price - base.price) / base.price - Math.abs(b.price - base.price) / base.price ||
        b.rating - a.rating,
    )
    .slice(0, limit);
}

export function listCategories() {
  return CATEGORIES.map((c) => ({
    ...c,
    count: catalog.filter((p) => p.category === c.slug).length,
    fromPrice: Math.min(...catalog.filter((p) => p.category === c.slug).map((p) => p.price)),
  }));
}
