/** Wordmark SVG propio de Zentinel Store (Zentinel Labs). Hereda color del tema. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo" aria-label="Zentinel Store">
      <svg className="logo__mark" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="10" className="logo__tile" />
        <path d="M11 12h18L13 28h16" className="logo__z" />
        <circle cx="30" cy="12" r="2.4" className="logo__dot" />
      </svg>
      {!compact && (
        <span className="logo__text">
          <b>ZENTINEL</b>
          <small>STORE · LABS</small>
        </span>
      )}
    </span>
  );
}
