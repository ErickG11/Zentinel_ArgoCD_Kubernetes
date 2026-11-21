import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Rank } from '../api/types';
import { ProductArt } from '../components/ProductArt';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { CATEGORY_LABEL, formatPrice, formatSpec } from '../lib/format';
import { useCart } from '../state/cart';
import { MAX_COMPARE, useCompare } from '../state/compare';

const RANK_LABEL: Record<Rank, string> = { best: 'Mejor valor', worst: 'Peor valor', neutral: '' };

export function ComparePage() {
  const compare = useCompare();
  const { dispatch, setOpen } = useCart();
  const ids = compare.ids;
  const enabled = ids.length >= 2;

  const result = useQuery({
    queryKey: ['compare', ids],
    queryFn: () => api.compare(ids),
    enabled,
    retry: false,
  });
  const firstId = ids[0];
  const first = useQuery({
    queryKey: ['product', firstId],
    queryFn: () => api.product(firstId!),
    enabled: !!firstId,
  });
  const sameCategory = useQuery({
    queryKey: ['pool', first.data?.category],
    queryFn: () =>
      api.products({ category: first.data!.category, pageSize: 48, sort: 'price_asc' }),
    enabled: !!first.data && ids.length < MAX_COMPARE,
  });

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Comparador</p>
        <h1>Compará hasta {MAX_COMPARE} productos</h1>
        <p>
          Las diferencias se resaltan: <b className="rank rank--best">verde</b> es mejor valor y{' '}
          <b className="rank rank--worst">rojo</b> peor valor.
        </p>
      </div>

      {ids.length === 0 && (
        <EmptyState
          title="Aún no elegiste productos"
          action={
            <Link to="/catalogo" className="btn btn--primary">
              Ir al catálogo
            </Link>
          }
        >
          Pulsa el botón de comparar en cualquier tarjeta de producto.
        </EmptyState>
      )}

      {ids.length > 0 && ids.length < MAX_COMPARE && sameCategory.data && (
        <div className="compare-add">
          <label htmlFor="add-compare">
            Agregar otro producto de {CATEGORY_LABEL[first.data!.category]}
          </label>
          <select
            id="add-compare"
            className="input"
            value=""
            onChange={(e) => e.target.value && compare.toggle(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {sameCategory.data.items
              .filter((p) => !ids.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPrice(p.price)}
                </option>
              ))}
          </select>
          <button className="btn btn--ghost btn--sm" onClick={compare.clear}>
            Vaciar
          </button>
        </div>
      )}

      {ids.length === 1 && (
        <p className="muted">
          Agrega al menos un producto más de la misma categoría para comparar.
        </p>
      )}
      {enabled && result.isLoading && <Skeleton className="sk-table" />}
      {enabled && result.isError && (
        <ErrorState error={result.error} onRetry={() => result.refetch()} />
      )}

      {result.data && enabled && (
        <div className="table-wrap">
          <table className="compare-table">
            <caption className="sr-only">Comparación de productos</caption>
            <thead>
              <tr>
                <td />
                {result.data.products.map((p) => (
                  <th
                    key={p.id}
                    scope="col"
                    className={result.data!.winnerId === p.id ? 'is-winner' : ''}
                  >
                    <div className="compare-head">
                      <ProductArt product={p} size="thumb" />
                      <Link to={`/producto/${p.id}`}>{p.name}</Link>
                      {result.data!.winnerId === p.id && (
                        <span className="badge badge--ok">Mejor en general</span>
                      )}
                      <div className="compare-head__actions">
                        <button
                          className="btn btn--primary btn--sm"
                          disabled={p.stock === 0}
                          onClick={() => {
                            dispatch({ type: 'add', product: p });
                            setOpen(true);
                          }}
                        >
                          Agregar
                        </button>
                        <button className="link-btn" onClick={() => compare.remove(p.id)}>
                          Quitar
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.rows.map((row) => (
                <tr key={row.key} className={row.identical ? 'is-same' : ''}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((v) => (
                    <td key={v.productId} className={`mono rank rank--${v.rank}`}>
                      {row.key === 'price' && typeof v.value === 'number'
                        ? formatPrice(v.value)
                        : formatSpec(v.value, row.unit)}
                      {v.rank !== 'neutral' && (
                        <span className="sr-only"> ({RANK_LABEL[v.rank]})</span>
                      )}
                      {v.rank === 'best' && (
                        <span aria-hidden="true" className="rank__mark">
                          ▲
                        </span>
                      )}
                      {v.rank === 'worst' && (
                        <span aria-hidden="true" className="rank__mark">
                          ▼
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
