import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { PAYMENT_LABEL, formatPrice } from '../lib/format';

export function VerifyPage() {
  const { token } = useParams();
  const nav = useNavigate();
  const [input, setInput] = useState(token ?? '');
  const [hint, setHint] = useState('');

  const result = useQuery({
    queryKey: ['verify', token],
    queryFn: () => api.verifyOrder(token!),
    enabled: !!token,
    retry: false,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (/^ZS-[A-Z0-9]{6}$/i.test(v)) {
      setHint(
        'El código ZS-XXXXXX identifica el pedido, pero la validación necesita el token firmado completo (no guardamos pedidos en una base de datos). Pega el token que aparece en tu comprobante.',
      );
      return;
    }
    if (!v) return;
    setHint('');
    nav(`/pedido/verificar/${encodeURIComponent(v)}`);
  };

  const err = result.error instanceof ApiError ? result.error : null;
  const order = result.data?.order;

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Comprobantes</p>
        <h1>Verificar comprobante</h1>
        <p>
          Pega el token de tu comprobante: comprobamos la firma y mostramos el pedido tal como fue
          emitido, sin importar qué servidor lo generó.
        </p>
      </div>
      <form onSubmit={submit} className="verify-form">
        <label htmlFor="v-token">Token del comprobante</label>
        <textarea
          id="v-token"
          className="input mono"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="eyJjb2RlIjoiWlMt….firma"
        />
        <button className="btn btn--primary" type="submit" disabled={result.isFetching}>
          {result.isFetching ? 'Verificando…' : 'Verificar'}
        </button>
      </form>
      {hint && (
        <p className="state state--error" role="alert">
          {hint}
        </p>
      )}

      {token && result.isError && (
        <div className="verdict verdict--bad verdict--lg" role="alert">
          <span className="verdict__dot" aria-hidden="true" />
          <div>
            <b>Comprobante NO válido</b>
            <small>{err?.message ?? 'No se pudo verificar.'}</small>
          </div>
        </div>
      )}
      {order && (
        <>
          <div className="verdict verdict--ok verdict--lg" role="status">
            <span className="verdict__dot" aria-hidden="true" />
            <div>
              <b>Comprobante válido ✓</b>
              <small>La firma coincide: el pedido no fue alterado.</small>
            </div>
          </div>
          <article className="receipt">
            <header className="receipt__head">
              <div>
                <small className="muted mono">CÓDIGO</small>
                <b className="receipt__code mono">{order.code}</b>
              </div>
              <div>
                <small className="muted mono">EMITIDO</small>
                <span className="mono">{new Date(order.issuedAt).toLocaleString('es-EC')}</span>
              </div>
            </header>
            <p>
              <b>{order.customer.name}</b> · {order.customer.city}
            </p>
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
                    <td>{l.name}</td>
                    <td className="mono">{l.qty}</td>
                    <td className="mono">{formatPrice(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="totals">
              <div className="totals__sum">
                <dt>Total ({PAYMENT_LABEL[order.paymentMethod]})</dt>
                <dd className="mono">{formatPrice(order.totals.total)}</dd>
              </div>
            </dl>
          </article>
        </>
      )}
      <p>
        <Link to="/catalogo" className="link-btn">
          ← Volver a la tienda
        </Link>
      </p>
    </div>
  );
}
