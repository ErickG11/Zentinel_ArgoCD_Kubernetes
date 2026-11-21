import type { ReactNode } from 'react';
import { ApiError } from '../api/client';

export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Cargando productos">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card card--skeleton">
          <Skeleton className="sk-art" />
          <Skeleton className="sk-line" style={{ width: '40%' }} />
          <Skeleton className="sk-line" />
          <Skeleton className="sk-line" style={{ width: '70%' }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="state state--empty" role="status">
      <svg viewBox="0 0 64 64" className="state__icon" aria-hidden="true">
        <circle cx="28" cy="28" r="16" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M40 40l14 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M22 28h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.';
  return (
    <div className="state state--error" role="alert">
      <svg viewBox="0 0 64 64" className="state__icon" aria-hidden="true">
        <path
          d="M32 8L58 54H6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M32 26v14M32 46v2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h3>No pudimos cargar esta sección</h3>
      <p className="muted">{message}</p>
      {onRetry && (
        <button className="btn btn--ghost" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Rating({ value }: { value: number }) {
  return (
    <span className="rating" aria-label={`Valoración ${value} de 5`}>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8z"
          fill="currentColor"
        />
      </svg>
      <span className="mono">{value.toFixed(1)}</span>
    </span>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="badge badge--danger">Agotado</span>;
  if (stock <= 8) return <span className="badge badge--warn">Quedan {stock}</span>;
  return <span className="badge badge--ok">En stock</span>;
}
