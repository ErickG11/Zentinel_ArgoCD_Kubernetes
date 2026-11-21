import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { BuildCategory, Preferences, RecommendedBuild, UseCase } from '../api/types';
import { ProductArt } from '../components/ProductArt';
import { ErrorState } from '../components/ui';
import { BUILD_STEPS, formatPrice } from '../lib/format';
import { useCart } from '../state/cart';

const USES: { key: UseCase; label: string; hint: string }[] = [
  { key: 'gaming', label: 'Gaming', hint: 'Máximos FPS: prioriza la GPU' },
  { key: 'video', label: 'Edición de video', hint: 'CPU, RAM y almacenamiento' },
  { key: 'programming', label: 'Programación', hint: 'Núcleos, RAM y SSD rápido' },
  { key: 'office', label: 'Ofimática', hint: 'Valor y bajo costo' },
  { key: 'streaming', label: 'Streaming', hint: 'CPU y GPU equilibrados' },
];

const DEFAULT_PREFS: Preferences = {
  cpuBrand: 'any',
  gpuBrand: 'any',
  size: 'any',
  noise: 'any',
  upgradeability: 'any',
};

export function AssistantPage() {
  const [budget, setBudget] = useState(1200);
  const [use, setUse] = useState<UseCase>('gaming');
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const mutation = useMutation({
    mutationFn: () => api.recommend({ budget, use, preferences: prefs, count: 3 }),
  });
  const data = mutation.data;
  const setPref = <K extends keyof Preferences>(k: K, v: Preferences[K]) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Asistente Zentinel</p>
        <h1>Dinos tu presupuesto. Armamos la build.</h1>
        <p>
          Evaluamos miles de combinaciones compatibles con búsqueda y poda inteligente, y te
          explicamos por qué cada build es buena y qué sacrifica.
        </p>
      </div>

      <form
        className="assistant-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="field">
          <label htmlFor="budget">Presupuesto (USD)</label>
          <div className="budget">
            <input
              id="budget"
              type="range"
              min={500}
              max={5000}
              step={50}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <input
              aria-label="Presupuesto en dólares"
              className="input mono budget__num"
              type="number"
              min={400}
              max={20000}
              step={50}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>
          <output className="mono budget__out" htmlFor="budget">
            {formatPrice(budget)}
          </output>
        </div>

        <fieldset className="field">
          <legend>¿Para qué la usarás?</legend>
          <div className="use-grid" role="radiogroup" aria-label="Uso principal">
            {USES.map((u) => (
              <label key={u.key} className={`use-opt ${use === u.key ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="use"
                  value={u.key}
                  checked={use === u.key}
                  onChange={() => setUse(u.key)}
                />
                <b>{u.label}</b>
                <small className="muted">{u.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field prefs">
          <legend>Preferencias</legend>
          <label>
            Marca de CPU
            <select
              className="input"
              value={prefs.cpuBrand}
              onChange={(e) => setPref('cpuBrand', e.target.value as Preferences['cpuBrand'])}
            >
              <option value="any">Cualquiera</option>
              <option value="amd">AMD</option>
              <option value="intel">Intel</option>
            </select>
          </label>
          <label>
            Marca de GPU
            <select
              className="input"
              value={prefs.gpuBrand}
              onChange={(e) => setPref('gpuBrand', e.target.value as Preferences['gpuBrand'])}
            >
              <option value="any">Cualquiera</option>
              <option value="nvidia">NVIDIA</option>
              <option value="amd">AMD</option>
            </select>
          </label>
          <label>
            Tamaño del equipo
            <select
              className="input"
              value={prefs.size}
              onChange={(e) => setPref('size', e.target.value as Preferences['size'])}
            >
              <option value="any">Estándar (ATX)</option>
              <option value="compact">Compacto (mATX / ITX)</option>
            </select>
          </label>
          <label>
            Nivel de ruido
            <select
              className="input"
              value={prefs.noise}
              onChange={(e) => setPref('noise', e.target.value as Preferences['noise'])}
            >
              <option value="any">Indiferente</option>
              <option value="quiet">Lo más silencioso</option>
            </select>
          </label>
          <label>
            Upgradeabilidad
            <select
              className="input"
              value={prefs.upgradeability}
              onChange={(e) =>
                setPref('upgradeability', e.target.value as Preferences['upgradeability'])
              }
            >
              <option value="any">Indiferente</option>
              <option value="high">Alta (ampliar a futuro)</option>
            </select>
          </label>
        </fieldset>

        <button className="btn btn--primary btn--lg" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Analizando combinaciones…' : 'Generar mis builds'}
        </button>
      </form>

      <section aria-live="polite" className="results">
        {mutation.isError && (
          <ErrorState error={mutation.error} onRetry={() => mutation.mutate()} />
        )}
        {data && data.builds.length === 0 && (
          <div className="state state--empty" role="status">
            <h3>Sin resultados</h3>
            <p className="muted">{data.message}</p>
          </div>
        )}
        {data && data.builds.length > 0 && (
          <>
            <p className="mono muted stats">
              {data.stats.evaluated.toLocaleString('es-EC')} combinaciones evaluadas en{' '}
              {data.stats.elapsedMs} ms
              {data.stats.truncated && ' · búsqueda acotada por el límite configurado'}
            </p>
            <div className="builds">
              {data.builds.map((b) => (
                <BuildCard key={b.rank} build={b} budget={budget} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function BuildCard({ build, budget }: { build: RecommendedBuild; budget: number }) {
  const { dispatch, setOpen } = useCart();
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(build.selection))
    query.set(k, Array.isArray(v) ? v[0]! : (v as string));
  const label = (c: BuildCategory) => BUILD_STEPS.find((s) => s.key === c)!.label;
  const gpu = build.components.find((c) => c.category === 'gpu')!.product;
  const cpu = build.components.find((c) => c.category === 'cpu')!.product;

  return (
    <article className={`build ${build.rank === 1 ? 'build--top' : ''}`}>
      <header className="build__head">
        <div>
          <span className="eyebrow">
            {build.rank === 1 ? 'Mejor opción' : `Opción ${build.rank}`}
          </span>
          <h2>
            {cpu.brand} + {gpu.name.replace(/^(NVIDIA GeForce|AMD Radeon) /, '')}
          </h2>
        </div>
        <div
          className="score"
          role="img"
          aria-label={`Puntaje ${build.score} de 100`}
          style={{ ['--p' as string]: build.score }}
        >
          <b className="mono">{Math.round(build.score)}</b>
          <small>score</small>
        </div>
      </header>

      <ul className="build__parts">
        {build.components.map((c) => (
          <li key={c.product.id}>
            <ProductArt product={c.product} size="thumb" />
            <div>
              <small className="mono muted">{label(c.category)}</small>
              <Link to={`/producto/${c.product.id}`}>{c.product.name}</Link>
            </div>
            <span className="mono">{formatPrice(c.product.price)}</span>
          </li>
        ))}
      </ul>

      <div className="build__total">
        <span>Total</span>
        <b className="mono">{formatPrice(build.totalPrice)}</b>
        <small className="mono muted">
          {formatPrice(build.remainingBudget)} libres de {formatPrice(budget)}
        </small>
      </div>

      <section>
        <h3>Por qué esta build</h3>
        <p className="muted">{build.why}</p>
      </section>
      <section>
        <h3>Qué sacrifica</h3>
        <ul className="sacrifices">
          {build.sacrifices.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <footer className="build__actions">
        <Link to={`/armador?${query.toString()}`} className="btn btn--primary">
          Abrir en el Armador
        </Link>
        <button
          className="btn btn--ghost"
          onClick={() => {
            dispatch({ type: 'addMany', products: build.components.map((c) => c.product) });
            setOpen(true);
          }}
        >
          Agregar al carrito
        </button>
      </footer>
    </article>
  );
}
