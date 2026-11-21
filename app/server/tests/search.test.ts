import { describe, expect, it } from 'vitest';
import { listProducts } from '../src/services/catalog.service';
import { compareProducts } from '../src/services/compare.service';
import { didYouMean, searchProducts } from '../src/services/search';
import { editDistance, normalize } from '../src/lib/text';

const top = (q: string) => searchProducts(q)[0]?.product;

describe('búsqueda difusa', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalize('  Gráfica  ÁÉÍÓÚ ')).toBe('grafica aeiou');
  });

  it('calcula distancia de edición con transposiciones', () => {
    expect(editDistance('ryzen', 'ryzne', 2)).toBe(1);
    expect(editDistance('abc', 'xyz', 1)).toBe(2);
  });

  it('tolera errores de tipeo', () => {
    expect(top('ryzem 7800')?.id).toBe('amd-ryzen-7-7800x3d');
    expect(
      searchProducts('kingtson').every((h) => h.product.brand === 'Kingston' || h.score > 0),
    ).toBe(true);
    expect(searchProducts('kingtson').length).toBeGreaterThan(0);
  });

  it('expande sinónimos: "memoria" encuentra RAM', () => {
    const ids = searchProducts('memoria')
      .slice(0, 6)
      .map((h) => h.product.category);
    expect(ids.filter((c) => c === 'ram').length).toBeGreaterThanOrEqual(5);
  });

  it('ignora tildes: "grafica" encuentra GPU', () => {
    expect(searchProducts('tarjeta grafica').some((h) => h.product.category === 'gpu')).toBe(true);
  });

  it('rankea por relevancia: el nombre exacto va primero', () => {
    expect(top('Noctua NH-D15')?.id).toBe('noctua-nh-d15');
  });

  it('devuelve vacío y sugiere corrección si nada coincide', () => {
    expect(searchProducts('zzzxxqq')).toHaveLength(0);
    expect(didYouMean('procesdor')).toBe('procesador');
  });
});

describe('listado de productos', () => {
  const base = { sort: 'relevance' as const, page: 1, pageSize: 12 };

  it('filtra por categoría y precio', () => {
    const r = listProducts({ ...base, category: 'gpu', maxPrice: 400 });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((p) => p.category === 'gpu' && p.price <= 400)).toBe(true);
  });

  it('ordena por precio ascendente y pagina', () => {
    const r = listProducts({ ...base, sort: 'price_asc', pageSize: 5 });
    expect(r.items).toHaveLength(5);
    expect(r.totalPages).toBeGreaterThan(10);
    const prices = r.items.map((p) => p.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });
});

describe('comparador', () => {
  it('marca mejor y peor valor según la dirección de cada spec', () => {
    const c = compareProducts(['amd-ryzen-5-7600', 'amd-ryzen-7-7800x3d', 'amd-ryzen-9-7950x']);
    const cores = c.rows.find((r) => r.key === 'cores')!;
    expect(cores.values.map((v) => v.rank)).toEqual(['worst', 'neutral', 'best']);
    const tdp = c.rows.find((r) => r.key === 'tdp')!;
    expect(tdp.values[0]!.rank).toBe('best'); // menor TDP es mejor
    expect(c.winnerId).toBe('amd-ryzen-9-7950x');
  });

  it('rechaza categorías mezcladas, pocos ids o más de 4', () => {
    expect(() => compareProducts(['amd-ryzen-5-7600', 'nvidia-rtx-4060'])).toThrow(
      /misma categoría/,
    );
    expect(() => compareProducts(['amd-ryzen-5-7600'])).toThrow(/al menos 2/);
    expect(() => compareProducts(['a', 'b', 'c', 'd', 'e'])).toThrow(/máximo 4/);
  });
});
