import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { BuildCategory, Issue, Product, Selection } from '../api/types';
import { PowerBar } from '../components/PowerBar';
import { ProductArt } from '../components/ProductArt';
import { ErrorState, Skeleton } from '../components/ui';
import { BUILD_STEPS, formatPrice, formatSpec } from '../lib/format';
import { specUnit } from '../lib/specs';
import { useCart } from '../state/cart';

type Parts = Partial<Record<BuildCategory, Product>>;
const KEYS = BUILD_STEPS.map((s) => s.key) as BuildCategory[];

const toSelection = (parts: Parts): Selection => {
  const sel: Selection = {};
  for (const k of KEYS) {
    const p = parts[k];
    if (!p) continue;
    if (k === 'storage') sel.storage = [p.id];
    else sel[k] = p.id;
  }
  return sel;
};

/** Specs más relevantes por tipo de pieza, para mostrar en la lista y el selector. */
const HIGHLIGHT: Record<BuildCategory, string[]> = {
  cpu: ['socket', 'cores', 'tdp'],
  motherboard: ['socket', 'ramType', 'formFactor'],
  ram: ['ramType', 'capacityGB', 'speedMHz'],
  gpu: ['vramGB', 'tdp', 'lengthMm'],
  storage: ['type', 'capacityGB', 'readMBs'],
  psu: ['watts', 'efficiency'],
  case: ['formFactors', 'maxGpuMm'],
  cooling: ['kind', 'tdpRating', 'heightMm'],
};
const specLine = (p: Product, cat: BuildCategory) =>
  HIGHLIGHT[cat].map((k) => formatSpec(p.specs[k] ?? null, specUnit(k))).join(' · ');

export function BuilderPage() {
  const [params, setParams] = useSearchParams();
  const [parts, setParts] = useState<Parts>({});
  const [slot, setSlot] = useState<BuildCategory | null>(null);
  const { dispatch, setOpen } = useCart();
  const hydrated = useRef(false);

  // Hidratación inicial desde la URL (?cpu=..&gpu=..): permite compartir builds y abrir desde el Asistente.
  const [initial] = useState(() =>
    KEYS.map((k) => [k, params.get(k)] as const).filter(([, v]) => v),
  );
  const loaded = useQueries({
    queries: initial.map(([k, id]) => ({
      queryKey: ['product', id],
      queryFn: () => api.product(id!),
      meta: { k },
    })),
  });
  const initDone = loaded.every((q) => !q.isLoading);
  useEffect(() => {
    if (hydrated.current || !initDone) return;
    hydrated.current = true;
    const next: Parts = {};
    initial.forEach(([k], i) => {
      const p = loaded[i]?.data;
      if (p && p.category === k) next[k] = p;
    });
    setParts(next);
  }, [initDone, initial, loaded]);

  useEffect(() => {
    if (!hydrated.current) return;
    const next = new URLSearchParams();
    for (const k of KEYS) if (parts[k]) next.set(k, parts[k]!.id);
    setParams(next, { replace: true });
  }, [parts, setParams]);

  const selection = toSelection(parts);
  const hasParts = Object.keys(selection).length > 0;
  const check = useQuery({
    queryKey: ['check', selection],
    queryFn: () => api.check(selection),
    enabled: hasParts,
    placeholderData: keepPreviousData,
  });

  const result = hasParts ? check.data : undefined;
  const issuesFor = (k: BuildCategory): Issue[] =>
    (result?.issues ?? []).filter((i) => i.components.includes(k) && i.severity !== 'info');
  const chosen = KEYS.map((k) => parts[k]).filter((p): p is Product => !!p);
  const complete = result?.complete && result.compatible;
  const discount = complete ? Math.round(result!.price.total * 0.05 * 100) / 100 : 0;

  const addBuild = () => {
    dispatch({ type: 'addMany', products: chosen });
    setOpen(true);
  };

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Armador de PC</p>
        <h1>Armá tu PC pieza por pieza</h1>
        <p>
          Cada vez que eliges o cambias un componente verificamos la compatibilidad en vivo. Compra
          la build completa y compatible y obtén <b>5 % de descuento</b>.
        </p>
      </div>

      <div className="builder">
        <ol className="slots" aria-label="Componentes de la build">
          {BUILD_STEPS.map((s, i) => {
            const p = parts[s.key];
            const issues = issuesFor(s.key);
            const hasErr = issues.some((x) => x.severity === 'error');
            const hasWarn = issues.length > 0 && !hasErr;
            return (
              <li
                key={s.key}
                className={`slot ${p ? 'is-filled' : ''} ${hasErr ? 'has-error' : hasWarn ? 'has-warn' : p ? 'is-ok' : ''}`}
              >
                <span className="slot__n mono">{String(i + 1).padStart(2, '0')}</span>
                <div className="slot__main">
                  <div className="slot__label">
                    {s.label}
                    {s.key === 'cooling' && <small className="muted"> (opcional)</small>}
                  </div>
                  {p ? (
                    <div className="slot__product">
                      <ProductArt product={p} size="thumb" />
                      <div>
                        <Link to={`/producto/${p.id}`} className="slot__name">
                          {p.name}
                        </Link>
                        <small className="mono muted">{specLine(p, s.key)}</small>
                        <b className="mono slot__price">{formatPrice(p.price)}</b>
                        {issues.map((x) => (
                          <p key={x.code} className={`slot__issue slot__issue--${x.severity}`}>
                            {x.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="muted small">Sin elegir</p>
                  )}
                </div>
                <div className="slot__actions">
                  <button
                    className={`btn btn--sm ${p ? 'btn--ghost' : 'btn--primary'}`}
                    onClick={() => setSlot(s.key)}
                  >
                    {p ? 'Cambiar' : 'Elegir'}
                  </button>
                  {p && (
                    <button
                      className="link-btn"
                      onClick={() =>
                        setParts((cur) => {
                          const n = { ...cur };
                          delete n[s.key];
                          return n;
                        })
                      }
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="summary" aria-label="Resumen de la build" aria-live="polite">
          <h2>Resumen</h2>
          {!hasParts && (
            <p className="muted">
              Elige un componente para empezar. También puedes{' '}
              <Link to="/asistente" className="link-btn">
                pedirle una build al Asistente
              </Link>
              .
            </p>
          )}
          {hasParts && !result && check.isLoading && <Skeleton className="sk-line" />}
          {check.isError && <ErrorState error={check.error} onRetry={() => check.refetch()} />}
          {result && (
            <>
              <div className={`verdict ${result.compatible ? 'verdict--ok' : 'verdict--bad'}`}>
                <span className="verdict__dot" aria-hidden="true" />
                <div>
                  <b>{result.compatible ? 'Compatible' : 'Incompatible'}</b>
                  <small className="muted">
                    {result.complete
                      ? 'Build completa'
                      : `Faltan: ${result.missing.map((m) => BUILD_STEPS.find((s) => s.key === m)!.label.toLowerCase()).join(', ')}`}
                  </small>
                </div>
              </div>

              <PowerBar power={result.power} />

              {result.issues.length > 0 ? (
                <ul className="issues">
                  {result.issues.map((i) => (
                    <li key={i.code + i.message} className={`issue issue--${i.severity}`}>
                      <span className="issue__tag mono">
                        {i.severity === 'error'
                          ? 'ERROR'
                          : i.severity === 'warning'
                            ? 'AVISO'
                            : 'INFO'}
                      </span>
                      {i.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Sin conflictos detectados hasta ahora.</p>
              )}

              <dl className="totals">
                {result.price.breakdown.map((b) => (
                  <div key={b.productId}>
                    <dt className="small muted">{b.name}</dt>
                    <dd className="mono">{formatPrice(b.price)}</dd>
                  </div>
                ))}
                <div className="totals__sum">
                  <dt>Total</dt>
                  <dd className="mono">{formatPrice(result.price.total)}</dd>
                </div>
                {complete && (
                  <div className="totals__save">
                    <dt>Descuento combo (5 %)</dt>
                    <dd className="mono">−{formatPrice(discount)}</dd>
                  </div>
                )}
              </dl>
              <button
                className="btn btn--primary btn--block"
                disabled={chosen.length === 0 || chosen.some((p) => p.stock === 0)}
                onClick={addBuild}
              >
                {complete ? 'Agregar build completa al carrito' : 'Agregar piezas al carrito'}
              </button>
              {complete && (
                <p className="muted small">El descuento del 5 % se aplica en el checkout.</p>
              )}
              {!result.compatible && (
                <p className="small slot__issue slot__issue--error">
                  Hay errores de compatibilidad: no se aplicará el combo.
                </p>
              )}
            </>
          )}
        </aside>
      </div>

      {slot && (
        <Picker
          category={slot}
          parts={parts}
          onClose={() => setSlot(null)}
          onPick={(p) => {
            setParts((cur) => ({ ...cur, [slot]: p }));
            setSlot(null);
          }}
        />
      )}
    </div>
  );
}

/** Selector de piezas: muestra, en vivo, si cada opción sería compatible con lo ya elegido. */
function Picker({
  category,
  parts,
  onPick,
  onClose,
}: {
  category: BuildCategory;
  parts: Parts;
  onPick: (p: Product) => void;
  onClose: () => void;
}) {
  const label = BUILD_STEPS.find((s) => s.key === category)!.label;
  const [filter, setFilter] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const list = useQuery({
    queryKey: ['pool', category],
    queryFn: () => api.products({ category, pageSize: 48, sort: 'price_asc' }),
  });
  const base = toSelection(parts);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const items = (list.data?.items ?? []).filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()),
  );
  const hasOthers = Object.keys(base).some(
    (k) => k !== (category === 'storage' ? 'storage' : category),
  );
  const checks = useQueries({
    queries: items.map((p) => {
      const sel: Selection = { ...base };
      if (category === 'storage') sel.storage = [p.id];
      else sel[category] = p.id;
      return {
        queryKey: ['check', sel],
        queryFn: () => api.check(sel),
        enabled: hasOthers,
        staleTime: 60_000,
      };
    }),
  });

  return (
    <div className="modal">
      <div className="modal__scrim" onClick={onClose} />
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Elegir ${label}`}
        tabIndex={-1}
        ref={panel}
      >
        <header className="modal__head">
          <h2>Elegir: {label}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
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
        <div className="modal__search">
          <label htmlFor="pick-filter" className="sr-only">
            Filtrar {label}
          </label>
          <input
            id="pick-filter"
            className="input"
            placeholder={`Filtrar ${label.toLowerCase()}…`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {hasOthers && (
            <p className="muted small">
              Las etiquetas indican compatibilidad con las piezas que ya elegiste.
            </p>
          )}
        </div>
        <ul className="modal__list">
          {list.isLoading && (
            <li>
              <Skeleton className="sk-line" />
            </li>
          )}
          {list.isError && (
            <li>
              <ErrorState error={list.error} onRetry={() => list.refetch()} />
            </li>
          )}
          {items.map((p, i) => {
            const res = checks[i]?.data;
            const errs =
              res?.issues.filter(
                (x) => x.severity === 'error' && x.components.includes(category),
              ) ?? [];
            const warns =
              res?.issues.filter(
                (x) => x.severity === 'warning' && x.components.includes(category),
              ) ?? [];
            const selected = parts[category]?.id === p.id;
            return (
              <li key={p.id}>
                <button
                  className={`pick ${selected ? 'is-selected' : ''}`}
                  onClick={() => onPick(p)}
                  disabled={p.stock === 0}
                >
                  <ProductArt product={p} size="thumb" />
                  <span className="pick__info">
                    <b>{p.name}</b>
                    <small className="mono muted">{specLine(p, category)}</small>
                    {errs[0] && (
                      <small className="pick__flag pick__flag--error">✕ {errs[0].message}</small>
                    )}
                    {!errs[0] && warns[0] && (
                      <small className="pick__flag pick__flag--warn">! {warns[0].message}</small>
                    )}
                    {res && hasOthers && !errs[0] && !warns[0] && (
                      <small className="pick__flag pick__flag--ok">✓ Compatible</small>
                    )}
                  </span>
                  <span className="mono pick__price">{formatPrice(p.price)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="muted small modal__foot">
          Puedes elegir una pieza incompatible para ver cómo reacciona el verificador.
        </p>
      </div>
    </div>
  );
}
