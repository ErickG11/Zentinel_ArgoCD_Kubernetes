import { catalog } from '../data/catalog';
import { categoryName } from '../data/categories';
import type { Product } from '../data/types';
import { editDistance, normalize, tokenize } from '../lib/text';

/**
 * Búsqueda difusa propia (sin dependencias): normaliza tildes, expande sinónimos,
 * tolera errores de tipeo con distancia de Damerau-Levenshtein y rankea por
 * relevancia ponderando nombre > marca > tags > categoría > descripción.
 */

/** Grupos de sinónimos (todo normalizado, sin tildes). */
const SYNONYM_GROUPS: string[][] = [
  ['ram', 'memoria', 'memorias'],
  ['cpu', 'procesador', 'procesadores', 'microprocesador'],
  ['gpu', 'grafica', 'graficas', 'tarjeta', 'video', 'vga'],
  ['ssd', 'nvme', 'm.2', 'almacenamiento', 'disco'],
  ['hdd', 'disco', 'duro'],
  ['placa', 'motherboard', 'mainboard', 'madre'],
  ['fuente', 'psu', 'poder'],
  ['case', 'gabinete', 'caja', 'chasis'],
  ['cooler', 'disipador', 'ventilador', 'refrigeracion', 'aio'],
  ['auriculares', 'audifonos', 'headset', 'airpods', 'cascos', 'diadema'],
  ['mouse', 'raton'],
  ['teclado', 'keyboard'],
  ['monitor', 'pantalla'],
  ['laptop', 'portatil', 'notebook', 'macbook'],
  ['cargador', 'charger', 'adaptador'],
  ['bateria', 'powerbank', 'power'],
  ['funda', 'case', 'protector', 'carcasa'],
  ['cable', 'cables', 'conector'],
];

const synonymMap = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    const set = synonymMap.get(word) ?? new Set<string>();
    group.forEach((w) => set.add(w));
    synonymMap.set(word, set);
  }
}

interface IndexedProduct {
  product: Product;
  fields: { weight: number; words: string[] }[];
}

const FIELD_WEIGHTS = { name: 5, brand: 4, tags: 3, category: 2, description: 1 };

const index: IndexedProduct[] = catalog.map((product) => ({
  product,
  fields: [
    { weight: FIELD_WEIGHTS.name, words: tokenize(product.name) },
    { weight: FIELD_WEIGHTS.brand, words: tokenize(product.brand) },
    { weight: FIELD_WEIGHTS.tags, words: product.tags.flatMap(tokenize) },
    { weight: FIELD_WEIGHTS.category, words: tokenize(categoryName(product.category)) },
    { weight: FIELD_WEIGHTS.description, words: tokenize(product.description) },
  ],
}));

/** Vocabulario completo del catálogo, para corregir tokens ("did you mean"). */
const vocabulary = [...new Set(index.flatMap((i) => i.fields.flatMap((f) => f.words)))];

/** Tolerancia de errores según longitud del término. */
function maxDistance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

/** Calidad de coincidencia entre un término de la consulta y una palabra indexada (0..1). */
function matchQuality(term: string, word: string): number {
  if (term === word) return 1;
  if (term.length >= 2 && word.startsWith(term)) return 0.9;
  const max = maxDistance(term.length);
  if (max === 0) return 0;
  const d = editDistance(term, word, max);
  if (d > max) return 0;
  return d === 1 ? 0.7 : 0.5;
}

/** Expande un término a sí mismo + sinónimos exactos (con menor peso). */
function expand(term: string): { term: string; factor: number }[] {
  const out = [{ term, factor: 1 }];
  for (const syn of synonymMap.get(term) ?? []) {
    if (syn !== term) out.push({ term: syn, factor: 0.85 });
  }
  return out;
}

export interface SearchHit {
  product: Product;
  score: number;
}

/** Puntúa un producto contra la consulta; 0 si algún término no coincide en ningún campo. */
function scoreProduct(item: IndexedProduct, terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const { term: t, factor } of expand(term)) {
      for (const field of item.fields) {
        for (const word of field.words) {
          const q = matchQuality(t, word) * factor;
          if (q > 0) best = Math.max(best, q * field.weight);
        }
      }
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

/** Busca productos; devuelve coincidencias ordenadas por relevancia descendente. */
export function searchProducts(query: string, pool: readonly Product[] = catalog): SearchHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return pool.map((product) => ({ product, score: 0 }));
  const allowed = new Set(pool.map((p) => p.id));
  const hits: SearchHit[] = [];
  for (const item of index) {
    if (!allowed.has(item.product.id)) continue;
    const score = scoreProduct(item, terms);
    if (score > 0) hits.push({ product: item.product, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
}

/** Sugerencia de corrección ("quisiste decir") para consultas sin resultados. */
export function didYouMean(query: string): string | undefined {
  const terms = tokenize(query);
  if (terms.length === 0) return undefined;
  const fixed = terms.map((term) => {
    const max = Math.max(1, maxDistance(term.length));
    let best = term;
    let bestD = max + 1;
    for (const word of vocabulary) {
      if (word === term) return term;
      const d = editDistance(term, word, max);
      if (d < bestD) {
        bestD = d;
        best = word;
      }
    }
    return best;
  });
  const result = fixed.join(' ');
  return result === normalize(query) ? undefined : result;
}

/** Sugerencias de autocompletado: los mejores nombres de producto para la consulta. */
export function suggest(
  query: string,
  limit = 6,
): { id: string; name: string; category: string }[] {
  return searchProducts(query)
    .slice(0, limit)
    .map(({ product }) => ({ id: product.id, name: product.name, category: product.category }));
}
