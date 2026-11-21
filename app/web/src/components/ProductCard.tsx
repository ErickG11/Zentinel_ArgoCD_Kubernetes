import { Link } from 'react-router-dom';
import type { Product } from '../api/types';
import { CATEGORY_LABEL, formatPrice } from '../lib/format';
import { useCart } from '../state/cart';
import { MAX_COMPARE, useCompare } from '../state/compare';
import { ProductArt } from './ProductArt';
import { Rating, StockBadge } from './ui';

export function ProductCard({ product }: { product: Product }) {
  const { dispatch, setOpen } = useCart();
  const compare = useCompare();
  const inCompare = compare.has(product.id);
  const compareFull = !inCompare && compare.ids.length >= MAX_COMPARE;

  return (
    <article className="card product-card">
      <Link
        to={`/producto/${product.id}`}
        className="product-card__media"
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductArt product={product} />
        <span className="product-card__cat mono">{CATEGORY_LABEL[product.category]}</span>
      </Link>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="product-card__brand">{product.brand}</span>
          <Rating value={product.rating} />
        </div>
        <h3 className="product-card__name">
          <Link to={`/producto/${product.id}`}>{product.name}</Link>
        </h3>
        <StockBadge stock={product.stock} />
        <div className="product-card__foot">
          <span className="price mono">{formatPrice(product.price)}</span>
          <div className="product-card__actions">
            <button
              type="button"
              className={`icon-btn ${inCompare ? 'is-active' : ''}`}
              aria-pressed={inCompare}
              disabled={compareFull}
              title={
                compareFull
                  ? `Máximo ${MAX_COMPARE} productos`
                  : inCompare
                    ? 'Quitar de la comparación'
                    : 'Comparar'
              }
              onClick={() => compare.toggle(product.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="sr-only">
                {inCompare ? 'Quitar de la comparación' : 'Comparar'} {product.name}
              </span>
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={product.stock === 0}
              onClick={() => {
                dispatch({ type: 'add', product });
                setOpen(true);
              }}
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
