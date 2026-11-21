import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { SearchBox } from '../components/SearchBox';
import { EmptyState, ErrorState, ProductGridSkeleton } from '../components/ui';
import { CATEGORY_LABEL, formatPrice } from '../lib/format';

const SORTS = [
  ['relevance', 'Relevancia'],
  ['price_asc', 'Precio: menor a mayor'],
  ['price_desc', 'Precio: mayor a menor'],
  ['rating', 'Mejor valorados'],
  ['name', 'Nombre (A–Z)'],
] as const;

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const brands = params.get('brand')?.split(',').filter(Boolean) ?? [];
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const inStock = params.get('inStock') === '1';
  const rating = params.get('rating') ?? '';
  const sort = params.get('sort') ?? 'relevance';
  const page = Number(params.get('page') ?? 1);

  const [price, setPrice] = useState({ min: minPrice, max: maxPrice });
  useEffect(() => {
    setPrice({ min: minPrice, max: maxPrice });
  }, [minPrice, maxPrice]);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const query = useQuery({
    queryKey: [
      'products',
      { q, category, brands, minPrice, maxPrice, inStock, rating, sort, page },
    ],
    queryFn: () =>
      api.products({
        q: q || undefined,
        category: category || undefined,
        brand: brands.length ? brands : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        inStock: inStock || undefined,
        rating: rating ? Number(rating) : undefined,
        sort,
        page,
        pageSize: 12,
      }),
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const activeFilters = [category, brands.length, minPrice, maxPrice, inStock, rating].filter(
    Boolean,
  ).length;
  const title = category
    ? (CATEGORY_LABEL[category] ?? 'Catálogo')
    : q
      ? `Resultados para “${q}”`
      : 'Catálogo';

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Zentinel Store</p>
        <h1>{title}</h1>
        {data && (
          <p aria-live="polite" className="mono muted">
            {data.total} producto{data.total === 1 ? '' : 's'}
          </p>
        )}
      </div>
      <div className="catalog-search">
        <SearchBox initial={q} />
      </div>

      <div className="catalog">
        <details className="filters" open>
          <summary className="filters__toggle">
            Filtros {activeFilters > 0 && <span className="pill mono">{activeFilters}</span>}
          </summary>
          <div className="filters__body">
            <fieldset>
              <legend>Categoría</legend>
              <ul>
                <li>
                  <button
                    className={`filter-opt ${!category ? 'is-active' : ''}`}
                    onClick={() => set({ category: null })}
                  >
                    Todas
                  </button>
                </li>
                {data?.facets.categories.map((c) => (
                  <li key={c.slug}>
                    <button
                      className={`filter-opt ${category === c.slug ? 'is-active' : ''}`}
                      onClick={() => set({ category: c.slug })}
                    >
                      {c.name} <small className="mono">{c.count}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>

            <fieldset>
              <legend>Marca</legend>
              <ul className="filters__scroll">
                {data?.facets.brands.map((b) => (
                  <li key={b.name}>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={brands.includes(b.name)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...brands, b.name]
                            : brands.filter((x) => x !== b.name);
                          set({ brand: next.join(',') || null });
                        }}
                      />
                      <span>{b.name}</span>
                      <small className="mono muted">{b.count}</small>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <fieldset>
              <legend>Precio (USD)</legend>
              <form
                className="price-range"
                onSubmit={(e) => {
                  e.preventDefault();
                  set({ minPrice: price.min || null, maxPrice: price.max || null });
                }}
              >
                <label className="sr-only" htmlFor="pmin">
                  Precio mínimo
                </label>
                <input
                  id="pmin"
                  className="input mono"
                  inputMode="numeric"
                  placeholder={String(data?.facets.priceRange.min ?? 0)}
                  value={price.min}
                  onChange={(e) => setPrice({ ...price, min: e.target.value.replace(/\D/g, '') })}
                />
                <span aria-hidden="true">–</span>
                <label className="sr-only" htmlFor="pmax">
                  Precio máximo
                </label>
                <input
                  id="pmax"
                  className="input mono"
                  inputMode="numeric"
                  placeholder={String(data?.facets.priceRange.max ?? 2000)}
                  value={price.max}
                  onChange={(e) => setPrice({ ...price, max: e.target.value.replace(/\D/g, '') })}
                />
                <button className="btn btn--ghost btn--sm" type="submit">
                  OK
                </button>
              </form>
            </fieldset>

            <fieldset>
              <legend>Valoración mínima</legend>
              <div className="seg" role="radiogroup" aria-label="Valoración mínima">
                {['', '4', '4.5'].map((r) => (
                  <button
                    key={r}
                    role="radio"
                    aria-checked={rating === r}
                    className={rating === r ? 'is-active' : ''}
                    onClick={() => set({ rating: r || null })}
                  >
                    {r ? `${r}+ ★` : 'Todas'}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="check check--switch">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => set({ inStock: e.target.checked ? '1' : null })}
              />
              <span>Solo en stock</span>
            </label>

            {activeFilters > 0 && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setParams(q ? { q } : {}, { replace: true })}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </details>

        <section className="catalog__results" aria-label="Resultados">
          <div className="toolbar">
            <label htmlFor="sort" className="muted">
              Ordenar por
            </label>
            <select
              id="sort"
              className="input"
              value={sort}
              onChange={(e) => set({ sort: e.target.value })}
            >
              {SORTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {query.isLoading && <ProductGridSkeleton count={8} />}
          {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
          {data && data.items.length === 0 && (
            <EmptyState
              title="No encontramos productos"
              action={
                <div className="empty-actions">
                  {data.didYouMean && (
                    <button
                      className="btn btn--primary"
                      onClick={() => set({ q: data.didYouMean! })}
                    >
                      ¿Quisiste decir “{data.didYouMean}”?
                    </button>
                  )}
                  <button
                    className="btn btn--ghost"
                    onClick={() => setParams({}, { replace: true })}
                  >
                    Ver todo el catálogo
                  </button>
                </div>
              }
            >
              Prueba con otros términos o quita algunos filtros.
            </EmptyState>
          )}
          {data && data.items.length > 0 && (
            <div className={`grid ${query.isPlaceholderData ? 'is-stale' : ''}`}>
              {data.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {data && data.totalPages > 1 && (
            <nav className="pager" aria-label="Paginación">
              <button
                className="btn btn--ghost btn--sm"
                disabled={data.page <= 1}
                onClick={() => set({ page: String(data.page - 1) })}
              >
                ← Anterior
              </button>
              <span className="mono">
                Página {data.page} de {data.totalPages}
              </span>
              <button
                className="btn btn--ghost btn--sm"
                disabled={data.page >= data.totalPages}
                onClick={() => set({ page: String(data.page + 1) })}
              >
                Siguiente →
              </button>
            </nav>
          )}
          {data && (
            <p className="muted small mono">
              Rango de precios: {formatPrice(data.facets.priceRange.min)} –{' '}
              {formatPrice(data.facets.priceRange.max)}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
