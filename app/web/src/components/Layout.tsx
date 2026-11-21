import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { cartCount } from '../state/cart';
import { useCart } from '../state/cart';
import { useCompare } from '../state/compare';
import { useTheme } from '../state/theme';
import { CartDrawer } from './CartDrawer';
import { Logo } from './Logo';
import { SearchBox } from './SearchBox';

const NAV = [
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/armador', label: 'Armador de PC' },
  { to: '/asistente', label: 'Asistente' },
  { to: '/comparar', label: 'Comparar' },
  { to: '/estado', label: 'Infraestructura' },
];

export function Layout() {
  const { items, setOpen } = useCart();
  const compare = useCompare();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const count = cartCount(items);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>
      <header className="header">
        <div className="container header__row">
          <Link to="/" className="header__logo" aria-label="Zentinel Store — inicio">
            <Logo />
          </Link>
          <nav className="nav" aria-label="Principal">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                {n.label}
                {n.to === '/comparar' && compare.ids.length > 0 && (
                  <span className="pill mono" aria-label={`${compare.ids.length} productos`}>
                    {compare.ids.length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="header__tools">
            <button
              className="icon-btn"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title="Cambiar tema"
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <button
              className="icon-btn cart-btn"
              onClick={() => setOpen(true)}
              aria-label={`Abrir carrito (${count} artículos)`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M3 4h2l2.4 11h10.2L20 7H6.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="19.5" r="1.5" fill="currentColor" />
                <circle cx="17" cy="19.5" r="1.5" fill="currentColor" />
              </svg>
              {count > 0 && <span className="cart-btn__count mono">{count}</span>}
            </button>
          </div>
        </div>
        <div className="container header__search">
          <SearchBox />
        </div>
        <nav className="container mobile-nav" aria-label="Principal (móvil)">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />
      <CartDrawer />
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Logo />
          <p className="muted footer__tag">
            Tecnología real para gamers, creadores y estudiantes. Armá tu PC con compatibilidad
            garantizada.
          </p>
        </div>
        <nav aria-label="Tienda" className="footer__links">
          <h4>Tienda</h4>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/armador">Armador de PC</Link>
          <Link to="/asistente">Asistente Zentinel</Link>
          <Link to="/pedido/verificar">Verificar comprobante</Link>
        </nav>
        <nav aria-label="Plataforma" className="footer__links">
          <h4>Plataforma</h4>
          <Link to="/estado">Estado de la infraestructura</Link>
          <a href="/healthz">Health check</a>
          <a href="/metrics">Métricas</a>
        </nav>
      </div>
      <div className="container footer__bottom mono">
        Zentinel Store — Zentinel Labs — Automatización de la Configuración Continua — Erick Mateo
        Granda Delgado — UDLA
      </div>
    </footer>
  );
}
