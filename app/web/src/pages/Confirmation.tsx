import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Receipt } from '../api/types';
import { PAYMENT_LABEL, formatPrice } from '../lib/format';

function loadReceipt(state: unknown): Receipt | null {
  const fromState = (state as { receipt?: Receipt } | null)?.receipt;
  if (fromState) return fromState;
  try {
    const raw = sessionStorage.getItem('zs-last-receipt');
    return raw ? (JSON.parse(raw) as Receipt) : null;
  } catch {
    return null;
  }
}

export function ConfirmationPage() {
  const { state } = useLocation();
  const [receipt] = useState(() => loadReceipt(state));
  const [copied, setCopied] = useState(false);

  if (!receipt) {
    return (
      <div className="container page">
        <div className="state">
          <h1>No hay un pedido reciente</h1>
          <Link to="/catalogo" className="btn btn--primary">
            Ir al catálogo
          </Link>
        </div>
      </div>
    );
  }
  const { order, token } = receipt;
  const t = order.totals;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* portapapeles no disponible */
    }
  };

  return (
    <div className="container page">
      <div className="confirm">
        <div className="confirm__hero">
          <svg viewBox="0 0 64 64" className="confirm__check" aria-hidden="true">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
            <path
              d="M20 33l8 8 17-18"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="eyebrow">Pedido confirmado</p>
          <h1>¡Gracias, {order.customer.name.split(' ')[0]}!</h1>
          <p className="muted">
            Tu comprobante está firmado digitalmente y se puede verificar en cualquier momento.
          </p>
        </div>

        <article className="receipt" aria-label="Comprobante de pedido">
          <header className="receipt__head">
            <div>
              <small className="muted mono">CÓDIGO DE PEDIDO</small>
              <b className="receipt__code mono">{order.code}</b>
            </div>
            <div>
              <small className="muted mono">EMITIDO</small>
              <span className="mono">{new Date(order.issuedAt).toLocaleString('es-EC')}</span>
            </div>
          </header>
          <table className="receipt__table">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Cant.</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.productId}>
                  <td>
                    {l.name}
                    <small className="mono muted"> {l.sku}</small>
                  </td>
                  <td className="mono">{l.qty}</td>
                  <td className="mono">{formatPrice(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd className="mono">{formatPrice(t.subtotal)}</dd>
            </div>
            {t.comboApplied && (
              <div className="totals__save">
                <dt>Descuento combo (5 %)</dt>
                <dd className="mono">−{formatPrice(t.comboDiscount)}</dd>
              </div>
            )}
            <div>
              <dt>Envío</dt>
              <dd className="mono">{formatPrice(t.shipping)}</dd>
            </div>
            <div>
              <dt>IVA 15 %</dt>
              <dd className="mono">{formatPrice(t.iva)}</dd>
            </div>
            <div className="totals__sum">
              <dt>Total</dt>
              <dd className="mono">{formatPrice(t.total)}</dd>
            </div>
          </dl>
          <p className="small muted">
            Pago: {PAYMENT_LABEL[order.paymentMethod]} · Entrega en {order.customer.city}:{' '}
            {order.customer.address}
          </p>
          <div className="receipt__token">
            <label htmlFor="token">
              <small className="muted mono">TOKEN DE VERIFICACIÓN (firma HMAC-SHA256)</small>
            </label>
            <textarea
              id="token"
              className="input mono"
              readOnly
              rows={3}
              value={token}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="receipt__actions">
              <button className="btn btn--ghost btn--sm" onClick={copy}>
                {copied ? '¡Copiado!' : 'Copiar token'}
              </button>
              <Link className="btn btn--primary btn--sm" to={`/pedido/verificar/${token}`}>
                Verificar comprobante
              </Link>
              <button className="btn btn--ghost btn--sm" onClick={() => window.print()}>
                Imprimir
              </button>
            </div>
          </div>
        </article>
        <Link to="/catalogo" className="link-btn">
          ← Seguir comprando
        </Link>
      </div>
    </div>
  );
}
