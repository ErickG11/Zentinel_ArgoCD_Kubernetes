import type { PowerReport } from '../api/types';

const LABEL: Record<string, string> = {
  insufficient: 'Insuficiente',
  tight: 'Justa',
  adequate: 'Adecuada',
  ample: 'Amplia',
};

/** Barra de consumo estimado frente a la capacidad de la fuente. */
export function PowerBar({ power }: { power: PowerReport }) {
  const psu = power.psuWatts;
  const scale = Math.max(psu ?? 0, power.recommendedWatts, power.estimatedWatts) * 1.05;
  const usedPct = Math.min(100, (power.estimatedWatts / scale) * 100);
  const psuPct = psu ? Math.min(100, (psu / scale) * 100) : 0;
  const level = power.level ?? 'none';
  return (
    <div className={`power power--${level}`}>
      <div className="power__head">
        <span>Consumo estimado</span>
        <span className="mono">
          {power.estimatedWatts} W{psu ? ` / ${psu} W` : ''}
        </span>
      </div>
      <div
        className="power__track"
        role="meter"
        aria-label="Consumo estimado frente a la fuente"
        aria-valuemin={0}
        aria-valuemax={psu ?? power.recommendedWatts}
        aria-valuenow={power.estimatedWatts}
      >
        <div className="power__used" style={{ width: `${usedPct}%` }} />
        {psu && <div className="power__psu" style={{ left: `${psuPct}%` }} />}
      </div>
      <p className="power__foot">
        {power.level ? (
          <>
            Holgura <b>{LABEL[power.level]}</b>
            {power.headroomPct !== null && <span className="mono"> ({power.headroomPct} %)</span>}
          </>
        ) : (
          <>
            Fuente recomendada: <b className="mono">{power.recommendedWatts} W</b>
          </>
        )}
      </p>
    </div>
  );
}
