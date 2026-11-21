import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { SystemInfo } from '../api/types';
import { formatUptime } from '../lib/format';

interface PodStat {
  pod: string;
  hits: number;
  info: SystemInfo;
  lastSeen: number;
}
interface LogEntry {
  n: number;
  pod: string;
  ms: number;
  at: string;
}

const hue = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};

/** Panel de infraestructura: sondea /api/system/info cada 2 s y muestra qué Pod responde. */
export function StatusPage() {
  const [pods, setPods] = useState<Record<string, PodStat>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [current, setCurrent] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [total, setTotal] = useState(0);
  const counter = useRef(0);

  useEffect(() => {
    if (paused) return;
    let alive = true;
    const tick = async () => {
      const t0 = performance.now();
      try {
        const info = await api.systemInfo();
        if (!alive) return;
        const ms = Math.round(performance.now() - t0);
        counter.current += 1;
        const n = counter.current;
        setError(null);
        setCurrent(info);
        setTotal(n);
        setPods((cur) => ({
          ...cur,
          [info.pod]: {
            pod: info.pod,
            hits: (cur[info.pod]?.hits ?? 0) + 1,
            info,
            lastSeen: Date.now(),
          },
        }));
        setLog((l) =>
          [{ n, pod: info.pod, ms, at: new Date().toLocaleTimeString('es-EC') }, ...l].slice(0, 12),
        );
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void tick();
    const id = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [paused]);

  const list = Object.values(pods).sort((a, b) => a.pod.localeCompare(b.pod));
  const max = Math.max(1, ...list.map((p) => p.hits));

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Infraestructura</p>
        <h1>Quién me está atendiendo</h1>
        <p>
          Cada 2 segundos se consulta <code className="mono">/api/system/info</code>. Con varias
          réplicas, el Service de Kubernetes reparte las conexiones y verás rotar los Pods.
        </p>
      </div>

      <div className="status-bar">
        <span
          className={`live ${error ? 'live--bad' : paused ? 'live--paused' : 'live--ok'}`}
          role="status"
        >
          <i aria-hidden="true" /> {error ? 'Sin conexión' : paused ? 'En pausa' : 'En vivo'}
        </span>
        <span className="mono muted">
          {total} sondeos · {list.length} Pod{list.length === 1 ? '' : 's'} distinto
          {list.length === 1 ? '' : 's'}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setPods({});
            setLog([]);
            counter.current = 0;
            setTotal(0);
          }}
        >
          Reiniciar contadores
        </button>
      </div>
      {error && (
        <p className="state state--error" role="alert">
          {error}
        </p>
      )}

      {current && (
        <section
          className="now"
          aria-label="Pod que atendió la última petición"
          style={{ ['--h' as string]: hue(current.pod) }}
        >
          <div className="now__pod">
            <small className="mono muted">ATENDIDO POR</small>
            <b className="mono now__name">{current.pod}</b>
          </div>
          <dl className="now__grid">
            <div>
              <dt>Versión</dt>
              <dd className="mono">{current.version}</dd>
            </div>
            <div>
              <dt>Entorno</dt>
              <dd className="mono">{current.environment}</dd>
            </div>
            <div>
              <dt>Namespace</dt>
              <dd className="mono">{current.namespace}</dd>
            </div>
            <div>
              <dt>Uptime del Pod</dt>
              <dd className="mono">{formatUptime(current.uptimeSeconds)}</dd>
            </div>
            <div>
              <dt>Peticiones del Pod</dt>
              <dd className="mono">{current.requestsServed.toLocaleString('es-EC')}</dd>
            </div>
            <div>
              <dt>Commit</dt>
              <dd className="mono">{current.commit.slice(0, 8)}</dd>
            </div>
            <div>
              <dt>Node.js</dt>
              <dd className="mono">{current.node}</dd>
            </div>
          </dl>
        </section>
      )}

      <div className="status-cols">
        <section aria-labelledby="bal-title">
          <h2 id="bal-title" className="section__title">
            Balanceo entre réplicas
          </h2>
          {list.length === 0 ? (
            <p className="muted">Esperando el primer sondeo…</p>
          ) : (
            <ul className="pods">
              {list.map((p) => (
                <li key={p.pod} className="pod" style={{ ['--h' as string]: hue(p.pod) }}>
                  <div className="pod__head">
                    <b className="mono">{p.pod}</b>
                    <span className="mono">
                      {p.hits} resp. · {((p.hits / Math.max(total, 1)) * 100).toFixed(0)} %
                    </span>
                  </div>
                  <div
                    className="pod__bar"
                    role="meter"
                    aria-label={`Respuestas de ${p.pod}`}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={p.hits}
                  >
                    <div style={{ width: `${(p.hits / max) * 100}%` }} />
                  </div>
                  <small className="mono muted">
                    v{p.info.version} · {p.info.namespace} · {p.info.requestsServed} peticiones
                    totales en el Pod
                  </small>
                </li>
              ))}
            </ul>
          )}
          {list.length === 1 && total > 4 && (
            <p className="muted small">
              Solo ves un Pod: normal con una sola réplica, o si el navegador mantiene la conexión.
              Prueba la carga del HPA para ver más.
            </p>
          )}
        </section>

        <section aria-labelledby="log-title">
          <h2 id="log-title" className="section__title">
            Últimas respuestas
          </h2>
          <table className="log mono">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Hora</th>
                <th scope="col">Pod</th>
                <th scope="col">Latencia</th>
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.n}>
                  <td>{l.n}</td>
                  <td>{l.at}</td>
                  <td>
                    <span className="dot" style={{ ['--h' as string]: hue(l.pod) }} /> {l.pod}
                  </td>
                  <td>{l.ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
