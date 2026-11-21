import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ProductArt } from '../components/ProductArt';
import { ProductCard } from '../components/ProductCard';
import { ErrorState, Rating, Skeleton, StockBadge } from '../components/ui';
import { CATEGORY_LABEL, formatPrice, formatSpec } from '../lib/format';
import { specLabel, specUnit } from '../lib/specs';
import { useCart } from '../state/cart';
import { MAX_COMPARE, useCompare } from '../state/compare';

export function ProductPage() {
  const { id = '' } = useParams();
  const product = useQuery({ queryKey: ['product', id], queryFn: () => api.product(id) });
  const related = useQuery({ queryKey: ['related', id], queryFn: () => api.related(id) });
  const { dispatch, setOpen } = useCart();
  const compare = useCompare();
  const [qty, setQty] = useState(1);

  if (product.isLoading) {
    return (
      <div className="container page detail">
        <Skeleton className="sk-art sk-art--hero" />
        <div className="detail__info">
          <Skeleton className="sk-line" />
          <Skeleton className="sk-line" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }
  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <div className="container page">
        {notFound ? (
          <div className="state">
            <h1>Producto no encontrado</h1>
            <Link to="/catalogo" className="btn btn--primary">
              Volver al catálogo
            </Link>
          </div>
        ) : (
          <ErrorState error={product.error} onRetry={() => product.refetch()} />
        )}
      </div>
    );
  }
  const p = product.data!;
  const inCompare = compare.has(p.id);
  const max = Math.min(10, p.stock);

  return (
    <div className="container page">
      <nav aria-label="Migas de pan" className="crumbs mono">
        <Link to="/catalogo">Catálogo</Link> /{' '}
        <Link to={`/catalogo?category=${p.category}`}>{CATEGORY_LABEL[p.category]}</Link> /{' '}
        <span>{p.name}</span>
      </nav>
      <div className="detail">
        <ProductArt product={p} size="hero" />
        <div className="detail__info">
          <p className="eyebrow">
            {p.brand} · <span className="mono">{p.sku}</span>
          </p>
          <h1>{p.name}</h1>
          <div className="detail__meta">
            <Rating value={p.rating} />
            <StockBadge stock={p.stock} />
          </div>
          <p className="detail__desc">{p.description}</p>
          <p className="price price--xl mono">{formatPrice(p.price)}</p>
          <p className="muted small">Precio con IVA calculado en el checkout.</p>

          <div className="buy">
            <div className="qty" role="group" aria-label="Cantidad">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Disminuir"
                disabled={qty <= 1}
              >
                −
              </button>
              <span className="mono" aria-live="polite">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => Math.min(max, q + 1))}
                aria-label="Aumentar"
                disabled={qty >= max}
              >
                +
              </button>
            </div>
            <button
              className="btn btn--primary btn--lg"
              disabled={p.stock === 0}
              onClick={() => {
                dispatch({ type: 'add', product: p, qty });
                setOpen(true);
              }}
            >
              Agregar al carrito
            </button>
            <button
              className={`btn btn--ghost btn--lg ${inCompare ? 'is-active' : ''}`}
              aria-pressed={inCompare}
              disabled={!inCompare && compare.ids.length >= MAX_COMPARE}
              onClick={() => compare.toggle(p.id)}
            >
              {inCompare ? 'Quitar de comparar' : 'Comparar'}
            </button>
          </div>
          {['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooling'].includes(
            p.category,
          ) && (
            <Link to={`/armador?${p.category}=${p.id}`} className="link-btn">
              Usar en el Armador de PC →
            </Link>
          )}
        </div>
      </div>

      <section aria-labelledby="specs-title" className="section">
        <h2 id="specs-title" className="section__title">
          Especificaciones
        </h2>
        <table className="spec-table">
          <tbody>
            {Object.entries(p.specs).map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{specLabel(k)}</th>
                <td className="mono">{formatSpec(v, specUnit(k))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {p.tags.length > 0 && (
          <ul className="tags">
            {p.tags.map((t) => (
              <li key={t} className="tag mono">
                #{t}
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.data && related.data.items.length > 0 && (
        <section aria-labelledby="rel-title" className="section">
          <h2 id="rel-title" className="section__title">
            Productos relacionados
          </h2>
          <div className="grid">
            {related.data.items.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
