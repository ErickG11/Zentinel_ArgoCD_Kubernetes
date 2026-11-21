import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Customer, PaymentMethod } from '../api/types';
import { EmptyState, ErrorState } from '../components/ui';
import { CATEGORY_LABEL, PAYMENT_LABEL, formatPrice } from '../lib/format';
import { useCart } from '../state/cart';

type Errors = Partial<Record<keyof Customer, string>>;

export function validateCustomer(c: Customer): Errors {
  const e: Errors = {};
  if (c.name.trim().length < 3) e.name = 'Ingresa tu nombre completo';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.email = 'Correo electrónico inválido';
  if (!/^(\+593|0)\d{9}$/.test(c.phone.replace(/[\s-]/g, '')))
    e.phone = 'Teléfono ecuatoriano inválido (ej. 0991234567)';
  if (c.address.trim().length < 8) e.address = 'Dirección demasiado corta';
  if (!c.city) e.city = 'Selecciona tu ciudad';
  return e;
}

export function CheckoutPage() {
  const { items, dispatch } = useCart();
  const nav = useNavigate();
  const options = useQuery({
    queryKey: ['order-options'],
    queryFn: api.orderOptions,
    staleTime: Infinity,
  });
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Quito',
  });
  const [payment, setPayment] = useState<PaymentMethod>('transfer');
  const [errors, setErrors] = useState<Errors>({});

  const payloadItems = useMemo(
    () => items.map((i) => ({ productId: i.productId, qty: i.qty })),
    [items],
  );
  const quote = useQuery({
    queryKey: ['quote', payloadItems, customer.city],
    queryFn: () => api.quote({ items: payloadItems, city: customer.city }),
    enabled: items.length > 0,
    retry: false,
  });

  const order = useMutation({
    mutationFn: () =>
      api.createOrder({
        customer: { ...customer, phone: customer.phone.replace(/[\s-]/g, '') },
        items: payloadItems,
        paymentMethod: payment,
      }),
    onSuccess: (receipt) => {
      try {
        sessionStorage.setItem('zs-last-receipt', JSON.stringify(receipt));
      } catch {
        /* sin sessionStorage: la confirmación usa el estado de navegación */
      }
      dispatch({ type: 'clear' });
      nav('/pedido/confirmacion', { state: { receipt } });
    },
  });

  if (items.length === 0 && !order.isSuccess) {
    return (
      <div className="container page">
        <EmptyState
          title="Tu carrito está vacío"
          action={
            <Link to="/catalogo" className="btn btn--primary">
              Ir al catálogo
            </Link>
          }
        >
          Agrega productos para continuar con tu compra.
        </EmptyState>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = validateCustomer(customer);
    setErrors(v);
    if (Object.keys(v).length === 0) order.mutate();
    else document.getElementById(`f-${Object.keys(v)[0]}`)?.focus();
  };
  const set = (k: keyof Customer) => (e: { target: { value: string } }) =>
    setCustomer((c) => ({ ...c, [k]: e.target.value }));
  const t = quote.data?.totals;
  const serverErrors = order.error instanceof ApiError ? order.error.details : undefined;

  const field = (
    k: keyof Customer,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className={`field ${errors[k] ? 'has-error' : ''}`}>
      <label htmlFor={`f-${k}`}>{label}</label>
      <input
        id={`f-${k}`}
        className="input"
        value={customer[k]}
        onChange={set(k)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `e-${k}` : undefined}
        {...props}
      />
      {errors[k] && (
        <p id={`e-${k}`} className="field__error" role="alert">
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Checkout</p>
        <h1>Finaliza tu pedido</h1>
      </div>
      <div className="checkout">
        <form onSubmit={submit} noValidate className="checkout__form">
          <fieldset>
            <legend>Datos de entrega</legend>
            {field('name', 'Nombre completo', { autoComplete: 'name' })}
            <div className="field-row">
              {field('email', 'Correo electrónico', { type: 'email', autoComplete: 'email' })}
              {field('phone', 'Teléfono', {
                inputMode: 'tel',
                autoComplete: 'tel',
                placeholder: '0991234567',
              })}
            </div>
            {field('address', 'Dirección', { autoComplete: 'street-address' })}
            <div className={`field ${errors.city ? 'has-error' : ''}`}>
              <label htmlFor="f-city">Ciudad</label>
              <select id="f-city" className="input" value={customer.city} onChange={set('city')}>
                {options.data?.cities.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} — envío {formatPrice(c.shipping)}
                  </option>
                ))}
                {!options.data && <option value="Quito">Quito</option>}
              </select>
            </div>
          </fieldset>

          <fieldset>
            <legend>Método de pago (simulado)</legend>
            <div className="pay-grid" role="radiogroup" aria-label="Método de pago">
              {(['transfer', 'card_sim', 'cash_on_delivery'] as PaymentMethod[]).map((m) => (
                <label key={m} className={`use-opt ${payment === m ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="pay"
                    checked={payment === m}
                    onChange={() => setPayment(m)}
                  />
                  <b>{PAYMENT_LABEL[m]}</b>
                  <small className="muted">
                    {m === 'transfer'
                      ? 'Recibirás los datos bancarios'
                      : m === 'card_sim'
                        ? 'Sin cobro real: es una simulación'
                        : 'Paga al recibir tu pedido'}
                  </small>
                </label>
              ))}
            </div>
            <p className="muted small">
              No se procesa ningún pago real ni se guardan datos de tarjeta.
            </p>
          </fieldset>

          {order.isError && (
            <div className="state state--error" role="alert">
              <p>
                <b>No pudimos crear el pedido.</b> {(order.error as Error).message}
              </p>
              {serverErrors && (
                <ul>
                  {serverErrors.map((d) => (
                    <li key={d.path + d.message}>{d.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button
            className="btn btn--primary btn--lg"
            type="submit"
            disabled={order.isPending || quote.isError}
          >
            {order.isPending
              ? 'Procesando…'
              : `Confirmar pedido${t ? ` · ${formatPrice(t.total)}` : ''}`}
          </button>
        </form>

        <aside className="summary" aria-label="Resumen del pedido">
          <h2>Resumen</h2>
          <ul className="sum-lines">
            {items.map((i) => (
              <li key={i.productId}>
                <span>
                  <b>{i.qty}×</b> {i.name}
                  <small className="muted"> {CATEGORY_LABEL[i.category]}</small>
                </span>
                <span className="mono">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          {quote.isError && <ErrorState error={quote.error} onRetry={() => quote.refetch()} />}
          {t && (
            <dl className="totals">
              <div>
                <dt>Subtotal</dt>
                <dd className="mono">{formatPrice(t.subtotal)}</dd>
              </div>
              {t.comboApplied && (
                <div className="totals__save">
                  <dt>Descuento combo build (5 %)</dt>
                  <dd className="mono">−{formatPrice(t.comboDiscount)}</dd>
                </div>
              )}
              <div>
                <dt>
                  Envío ({customer.city}){t.shipping === 0 && ' · gratis'}
                </dt>
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
          )}
          {t?.comboApplied && (
            <p className="badge badge--ok">¡Build completa compatible! Descuento aplicado.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
