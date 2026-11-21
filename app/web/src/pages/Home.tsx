import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { CategorySlug } from '../api/types';
import { ProductArt } from '../components/ProductArt';
import { ProductCard } from '../components/ProductCard';
import { SearchBox } from '../components/SearchBox';
import { ErrorState, ProductGridSkeleton, Skeleton } from '../components/ui';
import { formatPrice } from '../lib/format';

export function HomePage() {
  const cats = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const featured = useQuery({
    queryKey: ['featured'],
    queryFn: () => api.products({ sort: 'rating', pageSize: 8, inStock: true }),
  });

  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">Zentinel Labs · Tecnología en Ecuador</p>
            <h1>
              Armá tu PC.
              <br />
              <span className="grad-text">Sin adivinar.</span>
            </h1>
            <p className="hero__lead">
              Más de 80 productos de tecnología, un armador que valida la compatibilidad en vivo y
              un asistente que diseña la mejor build para tu presupuesto.
            </p>
            <div className="hero__search">
              <SearchBox size="lg" />
            </div>
            <div className="hero__cta">
              <Link to="/armador" className="btn btn--primary">
                Abrir el Armador
              </Link>
              <Link to="/asistente" className="btn btn--ghost">
                Probar el Asistente
              </Link>
            </div>
            <ul className="hero__stats mono">
              <li>
                <b>83</b> productos
              </li>
              <li>
                <b>14</b> categorías
              </li>
              <li>
                <b>9</b> reglas de compatibilidad
              </li>
            </ul>
          </div>
          <div className="hero__visual" aria-hidden="true">
            <div className="hero__orb" />
            <div className="hero__panel">
              <div className="hero__panel-head mono">
                <span /> build.check()
              </div>
              {[
                ['Socket CPU ↔ placa', 'AM5 ✓'],
                ['Tipo de RAM', 'DDR5 ✓'],
                ['Largo de GPU ↔ case', '285 / 365 mm ✓'],
                ['Consumo vs fuente', '360 W / 750 W ✓'],
              ].map(([k, v]) => (
                <div key={k} className="hero__row mono">
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
              <div className="hero__ok mono">Compatible · 4 / 4 reglas</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container section" aria-labelledby="cats-title">
        <div className="section__head">
          <p className="eyebrow">Explorá</p>
          <h2 id="cats-title">Categorías</h2>
        </div>
        {cats.isError ? (
          <ErrorState error={cats.error} onRetry={() => cats.refetch()} />
        ) : (
          <ul className="cat-grid">
            {cats.isLoading
              ? Array.from({ length: 14 }, (_, i) => (
                  <li key={i}>
                    <Skeleton className="sk-cat" />
                  </li>
                ))
              : cats.data?.items.map((c) => (
                  <li key={c.slug}>
                    <Link to={`/catalogo?category=${c.slug}`} className="cat-tile">
                      <ProductArt
                        size="thumb"
                        product={{
                          id: c.slug,
                          name: c.name,
                          category: c.slug as CategorySlug,
                          specs: demoSpecs(c.slug),
                          tags: demoTags(c.slug),
                        }}
                      />
                      <span className="cat-tile__name">{c.name}</span>
                      <small className="mono muted">
                        {c.count} · desde {formatPrice(c.fromPrice)}
                      </small>
                    </Link>
                  </li>
                ))}
          </ul>
        )}
      </section>

      <section className="container section" aria-labelledby="feat-title">
        <div className="section__head section__head--row">
          <div>
            <p className="eyebrow">Lo mejor valorado</p>
            <h2 id="feat-title">Destacados</h2>
          </div>
          <Link to="/catalogo?sort=rating" className="link-btn">
            Ver todo →
          </Link>
        </div>
        {featured.isLoading && <ProductGridSkeleton count={4} />}
        {featured.isError && (
          <ErrorState error={featured.error} onRetry={() => featured.refetch()} />
        )}
        {featured.data && (
          <div className="grid">
            {featured.data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="container section">
        <div className="duo">
          <article className="feature feature--builder">
            <p className="eyebrow">Armá tu PC</p>
            <h2>Compatibilidad validada en vivo</h2>
            <p className="muted">
              Elegí pieza por pieza: el armador verifica socket, tipo de RAM, formato, largo de GPU
              y consumo de la fuente mientras avanzás, con descuento del 5 % al comprar la build
              completa.
            </p>
            <Link to="/armador" className="btn btn--primary">
              Ir al Armador
            </Link>
          </article>
          <article className="feature feature--assistant">
            <p className="eyebrow">Asistente Zentinel</p>
            <h2>La mejor build para tu presupuesto</h2>
            <p className="muted">
              Contanos cuánto querés gastar y para qué la usarás. Evaluamos miles de combinaciones
              compatibles y te explicamos por qué cada build es buena —y qué sacrifica—.
            </p>
            <Link to="/asistente" className="btn btn--primary">
              Consultar al Asistente
            </Link>
          </article>
        </div>
      </section>

      <section className="container section" aria-label="Beneficios">
        <ul className="benefits">
          {[
            [
              'Compatibilidad garantizada',
              'Reglas explícitas de socket, RAM, formato, GPU y fuente.',
            ],
            [
              'Comprobante verificable',
              'Cada pedido incluye un comprobante firmado que puedes validar cuando quieras.',
            ],
            [
              'Precios con IVA claro',
              'IVA 15 %, envío por ciudad y descuento por combo calculados en el servidor.',
            ],
            [
              'Alta disponibilidad',
              'Desplegada en Kubernetes con autoescalado: la tienda aguanta la demanda.',
            ],
          ].map(([t, d]) => (
            <li key={t} className="benefit">
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** Datos mínimos para elegir el glifo representativo de cada categoría en las tarjetas. */
function demoSpecs(slug: string): Record<string, string> {
  if (slug === 'peripherals') return { type: 'Teclado' };
  if (slug === 'storage') return { type: 'NVMe' };
  return {};
}
function demoTags(slug: string): string[] {
  return slug === 'audio' ? ['airpods'] : slug === 'chargers' ? ['power bank'] : [];
}
