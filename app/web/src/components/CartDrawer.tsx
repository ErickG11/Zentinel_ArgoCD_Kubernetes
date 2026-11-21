import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_LABEL, formatPrice } from '../lib/format';
import { useCart } from '../state/cart';

export function CartDrawer() {
  const { items, subtotal, open, setOpen, dispatch } = useCart();
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, setOpen]);

  return (
    <div className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="drawer__scrim" onClick={() => setOpen(false)} />
      <aside
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        tabIndex={-1}
        ref={panel}
      >
        <header className="drawer__head">
          <h2>Tu carrito</h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar carrito">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        {items.length === 0 ? (
          <div className="drawer__empty">
            <p className="muted">Tu carrito está vacío.</p>
            <Link to="/catalogo" className="btn btn--primary" onClick={() => setOpen(false)}>
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <>
            <ul className="drawer__list">
              {items.map((i) => (
                <li key={i.productId} className="cart-line">
                  <div className="cart-line__info">
                    <Link to={`/producto/${i.productId}`} onClick={() => setOpen(false)}>
                      {i.name}
                    </Link>
                    <small className="muted">{CATEGORY_LABEL[i.category]}</small>
                  </div>
                  <div className="cart-line__ctrl">
                    <div className="qty" role="group" aria-label={`Cantidad de ${i.name}`}>
                      <button
                        onClick={() =>
                          dispatch({ type: 'setQty', productId: i.productId, qty: i.qty - 1 })
                        }
                        aria-label="Disminuir cantidad"
                      >
                        −
                      </button>
                      <span className="mono" aria-live="polite">
                        {i.qty}
                      </span>
                      <button
                        onClick={() =>
                          dispatch({ type: 'setQty', productId: i.productId, qty: i.qty + 1 })
                        }
                        aria-label="Aumentar cantidad"
                        disabled={i.qty >= Math.min(i.stock, 10)}
                      >
                        +
                      </button>
                    </div>
                    <span className="mono cart-line__price">{formatPrice(i.price * i.qty)}</span>
                    <button
                      className="link-btn"
                      onClick={() => dispatch({ type: 'remove', productId: i.productId })}
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="drawer__foot">
              <div className="row-between">
                <span className="muted">Subtotal</span>
                <b className="mono">{formatPrice(subtotal)}</b>
              </div>
              <p className="muted small">
                IVA, envío y descuento por combo se calculan en el checkout.
              </p>
              <Link
                to="/checkout"
                className="btn btn--primary btn--block"
                onClick={() => setOpen(false)}
              >
                Ir al checkout
              </Link>
              <button
                className="btn btn--ghost btn--block"
                onClick={() => dispatch({ type: 'clear' })}
              >
                Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
