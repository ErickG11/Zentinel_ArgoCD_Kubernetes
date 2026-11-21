import { catalog } from '../data/catalog';
import {
  specsOf,
  type BoardSpecs,
  type BuildCategory,
  type CaseSpecs,
  type CoolerSpecs,
  type CpuSpecs,
  type GpuSpecs,
  type Product,
  type PsuSpecs,
  type RamSpecs,
  type StorageSpecs,
} from '../data/types';
import { round2 } from '../lib/text';
import {
  checkResolved,
  hasHardConflict,
  powerReport,
  type Build,
  type CheckResult,
  type Selection,
} from './compat';

/**
 * Asistente Zentinel: genera las N mejores configuraciones compatibles dentro del
 * presupuesto con búsqueda en profundidad + branch and bound.
 *
 *  - Poda por presupuesto: costo parcial + mínimo posible de las piezas restantes.
 *  - Poda por compatibilidad: se descartan ramas con errores duros de inmediato.
 *  - Poda por cota superior: puntaje parcial + mejor puntaje posible de lo que falta;
 *    si no supera al N-ésimo mejor ya encontrado, la rama se corta.
 *  - Límite de nodos evaluados configurable (RECOMMEND_MAX_COMBINATIONS) para
 *    controlar el costo de CPU por petición.
 */

export type UseCase = 'gaming' | 'video' | 'programming' | 'office' | 'streaming';

export interface Preferences {
  cpuBrand: 'any' | 'amd' | 'intel';
  gpuBrand: 'any' | 'nvidia' | 'amd';
  size: 'any' | 'compact';
  noise: 'any' | 'quiet';
  upgradeability: 'any' | 'high';
}

export interface RecommendInput {
  budget: number;
  use: UseCase;
  preferences: Preferences;
  count: number;
}

export interface RecommendedBuild {
  rank: number;
  score: number;
  totalPrice: number;
  remainingBudget: number;
  selection: Selection;
  components: { category: BuildCategory; product: Product }[];
  check: CheckResult;
  scoreBreakdown: Record<string, number>;
  why: string;
  sacrifices: string[];
}

export interface RecommendResult {
  builds: RecommendedBuild[];
  message?: string;
  stats: {
    evaluated: number;
    maxCombinations: number;
    truncated: boolean;
    completeBuilds: number;
    elapsedMs: number;
  };
}

export const USE_LABELS: Record<UseCase, string> = {
  gaming: 'gaming',
  video: 'edición de video',
  programming: 'programación',
  office: 'ofimática',
  streaming: 'streaming',
};

type Slot = BuildCategory | 'value';

/** Pesos por uso (se normalizan a 1 tras aplicar las preferencias). */
const BASE_WEIGHTS: Record<UseCase, Record<Slot, number>> = {
  gaming: {
    cpu: 0.2,
    gpu: 0.4,
    ram: 0.08,
    storage: 0.07,
    motherboard: 0.04,
    psu: 0.05,
    case: 0.03,
    cooling: 0.05,
    value: 0.08,
  },
  video: {
    cpu: 0.28,
    gpu: 0.17,
    ram: 0.18,
    storage: 0.14,
    motherboard: 0.05,
    psu: 0.04,
    case: 0.02,
    cooling: 0.07,
    value: 0.05,
  },
  programming: {
    cpu: 0.28,
    gpu: 0.04,
    ram: 0.22,
    storage: 0.18,
    motherboard: 0.06,
    psu: 0.03,
    case: 0.02,
    cooling: 0.06,
    value: 0.11,
  },
  office: {
    cpu: 0.2,
    gpu: 0.03,
    ram: 0.15,
    storage: 0.2,
    motherboard: 0.05,
    psu: 0.04,
    case: 0.03,
    cooling: 0.05,
    value: 0.25,
  },
  streaming: {
    cpu: 0.25,
    gpu: 0.27,
    ram: 0.12,
    storage: 0.1,
    motherboard: 0.04,
    psu: 0.04,
    case: 0.03,
    cooling: 0.06,
    value: 0.09,
  },
};

const ORDER: BuildCategory[] = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'psu',
  'case',
  'cooling',
  'storage',
];

function weightsFor(use: UseCase, pref: Preferences): Record<Slot, number> {
  const w = { ...BASE_WEIGHTS[use] };
  if (pref.noise === 'quiet') w.cooling += 0.06;
  if (pref.upgradeability === 'high') {
    w.motherboard += 0.05;
    w.psu += 0.04;
  }
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w) as Slot[]) w[k] = w[k] / sum;
  return w;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

/** Contribución (0..100) de cada pieza, independiente de las demás salvo la fuente. */
function staticScore(cat: BuildCategory, p: Product, pref: Preferences): number {
  switch (cat) {
    case 'cpu':
      return specsOf<CpuSpecs>(p).score;
    case 'gpu':
      return specsOf<GpuSpecs>(p).score;
    case 'ram': {
      const r = specsOf<RamSpecs>(p);
      return clamp((r.capacityGB / 64) * 75 + ((r.speedMHz - 3000) / 3000) * 25);
    }
    case 'storage': {
      const s = specsOf<StorageSpecs>(p);
      const typeBonus = s.type === 'NVMe' ? 40 : s.type === 'SATA SSD' ? 22 : 0;
      const cap = (s.capacityGB / 2000) * (s.type === 'HDD' ? 35 : 60);
      return clamp(cap + typeBonus);
    }
    case 'motherboard': {
      const m = specsOf<BoardSpecs>(p);
      const platformBonus = m.formFactor === 'ATX' ? 10 : 0;
      return clamp(m.ramSlots * 10 + m.m2Slots * 12 + (m.maxRamGB / 192) * 20 + platformBonus);
    }
    case 'case': {
      const c = specsOf<CaseSpecs>(p);
      return clamp(c.fans * 15 + (c.maxCoolerMm / 180) * 40 + (c.maxGpuMm / 400) * 30);
    }
    case 'cooling': {
      const k = specsOf<CoolerSpecs>(p);
      const noise = clamp(100 - (k.noiseDb - 22) * 8);
      const thermal = clamp((k.tdpRating / 300) * 100);
      return pref.noise === 'quiet' ? thermal * 0.4 + noise * 0.6 : thermal * 0.7 + noise * 0.3;
    }
    case 'psu':
      return 0; // depende de CPU y GPU: se calcula en dynamicPsuScore
  }
}

/** La fuente se puntúa por holgura real frente al consumo estimado y por eficiencia. */
function dynamicPsuScore(b: Build, psu: Product): number {
  const power = powerReport({ ...b, psu });
  const ratio = power.ratio ?? 1;
  const efficiency = specsOf<PsuSpecs>(psu).efficiency.includes('Gold') ? 15 : 0;
  return clamp(((ratio - 1) / 0.8) * 85 + efficiency);
}

/** Candidatos por categoría tras aplicar stock y preferencias duras. */
function candidatesFor(input: RecommendInput): Record<BuildCategory, Product[]> {
  const { preferences: pref } = input;
  const inStock = catalog.filter((p) => p.stock > 0);
  const by = (cat: BuildCategory) => inStock.filter((p) => p.category === cat);
  const out = {} as Record<BuildCategory, Product[]>;
  for (const cat of ORDER) out[cat] = by(cat);
  if (pref.cpuBrand !== 'any')
    out.cpu = out.cpu.filter((p) => p.brand.toLowerCase() === pref.cpuBrand);
  if (pref.gpuBrand !== 'any')
    out.gpu = out.gpu.filter((p) => p.brand.toLowerCase() === pref.gpuBrand);
  if (pref.size === 'compact') {
    out.motherboard = out.motherboard.filter((p) => specsOf<BoardSpecs>(p).formFactor !== 'ATX');
  }
  return out;
}

interface Node {
  score: number;
  breakdown: Record<string, number>;
  build: Build;
  cost: number;
}

export function recommendBuilds(input: RecommendInput, maxCombinations: number): RecommendResult {
  const started = performance.now();
  const { budget, use, preferences: pref } = input;
  const w = weightsFor(use, pref);
  const cands = candidatesFor(input);

  const stats = { evaluated: 0, completeBuilds: 0, truncated: false };
  const finish = (builds: RecommendedBuild[], message?: string): RecommendResult => ({
    builds,
    ...(message ? { message } : {}),
    stats: {
      evaluated: stats.evaluated,
      maxCombinations,
      truncated: stats.truncated,
      completeBuilds: stats.completeBuilds,
      elapsedMs: Math.round(performance.now() - started),
    },
  });

  const emptyCat = ORDER.find((c) => cands[c].length === 0);
  if (emptyCat) {
    return finish(
      [],
      'Con esas preferencias no hay piezas disponibles en stock para armar un equipo.',
    );
  }

  // Precálculos para podas: mínimos de precio y cotas máximas de puntaje por nivel.
  const minPrice = ORDER.map((c) => Math.min(...cands[c].map((p) => p.price)));
  const minRest = ORDER.map((_, i) => minPrice.slice(i).reduce((a, b) => a + b, 0));
  const staticMax = ORDER.map((c) =>
    c === 'psu' ? 100 : Math.max(...cands[c].map((p) => staticScore(c, p, pref))),
  );
  const restMax = ORDER.map((_, i) =>
    ORDER.slice(i).reduce((sum, c, j) => sum + w[c] * staticMax[i + j]!, 0),
  );

  if (minRest[0]! > budget) {
    return finish(
      [],
      `El presupuesto no alcanza: el equipo completo más económico cuesta $${round2(minRest[0]!)}.`,
    );
  }

  // Orden estático de candidatos (mejores primero) para encontrar buenas soluciones pronto.
  const ordered = {} as Record<BuildCategory, Product[]>;
  for (const c of ORDER) {
    ordered[c] = [...cands[c]].sort((a, b) =>
      c === 'psu'
        ? specsOf<PsuSpecs>(b).watts - specsOf<PsuSpecs>(a).watts
        : staticScore(c, b, pref) - staticScore(c, a, pref),
    );
  }

  const top: Node[] = [];
  // Se conserva un pool más grande que N para poder elegir builds realmente distintas.
  const keep = Math.max(input.count * 5, 15);

  const pairKey = (n: Node) => `${n.build.cpu!.id}|${n.build.gpu!.id}`;
  const record = (n: Node) => {
    // Máximo 2 variantes por par CPU+GPU: evita que el pool se llene de clones
    // que solo cambian de case o de SSD.
    const same = top.filter((t) => pairKey(t) === pairKey(n));
    if (same.length >= 2) {
      const worst = same[same.length - 1]!;
      if (n.score <= worst.score) return;
      top.splice(top.indexOf(worst), 1);
    }
    top.push(n);
    top.sort((a, b) => b.score - a.score);
    if (top.length > keep) top.pop();
  };

  let limit = maxCombinations;
  const dfs = (level: number, node: Node): void => {
    const cat = ORDER[level]!;
    for (const [i, product] of ordered[cat].entries()) {
      if (level === 0) {
        // Reparto equitativo del límite entre procesadores raíz: así un CPU caro no
        // consume todo el presupuesto de búsqueda y los demás también se exploran.
        if (stats.evaluated >= maxCombinations) {
          stats.truncated = true;
          return;
        }
        limit =
          stats.evaluated +
          Math.ceil((maxCombinations - stats.evaluated) / (ordered.cpu.length - i));
      }
      if (stats.evaluated >= limit) {
        stats.truncated = true;
        return;
      }
      stats.evaluated++;
      const cost = node.cost + product.price;
      if (cost + (minRest[level + 1] ?? 0) > budget) continue;

      const build: Build =
        cat === 'storage'
          ? { ...node.build, storage: [product] }
          : { ...node.build, [cat]: product };
      if (hasHardConflict(build)) continue;

      const contribution =
        cat === 'psu' ? dynamicPsuScore(node.build, product) : staticScore(cat, product, pref);
      let score = node.score + w[cat] * contribution;
      const breakdown = { ...node.breakdown, [cat]: round2(contribution) };

      // Penalización por cuello de botella CPU/GPU (se detecta al elegir la GPU).
      if (cat === 'gpu' && build.cpu) {
        const gap = specsOf<GpuSpecs>(product).score - specsOf<CpuSpecs>(build.cpu).score;
        const mismatch = Math.max(gap - 25, -gap - 35, 0);
        if (mismatch > 0) score -= Math.min(10, mismatch * 0.5);
      }

      const isLast = level === ORDER.length - 1;
      const valueNow = clamp((1 - cost / budget) * 100);
      if (isLast) {
        stats.completeBuilds++;
        const finalScore = score + w.value * valueNow;
        if (top.length < keep || finalScore > top[top.length - 1]!.score) {
          record({
            score: finalScore,
            breakdown: { ...breakdown, value: round2(valueNow) },
            build,
            cost,
          });
        }
        continue;
      }
      // Cota superior: lo mejor que aún podría sumar esta rama.
      const valueUb = clamp((1 - (cost + minRest[level + 1]!) / budget) * 100);
      const ub = score + restMax[level + 1]! + w.value * valueUb;
      if (top.length >= keep && ub <= top[top.length - 1]!.score) continue;

      dfs(level + 1, { score, breakdown, build, cost });
    }
  };

  dfs(0, { score: 0, breakdown: {}, build: {}, cost: 0 });

  if (top.length === 0) {
    return finish(
      [],
      stats.truncated
        ? 'Se alcanzó el límite de combinaciones antes de hallar una build compatible. Sube el presupuesto o relaja las preferencias.'
        : 'No existe una combinación compatible con ese presupuesto y esas preferencias. Prueba con más presupuesto.',
    );
  }

  const builds = diversify(top, input.count).map((n, i) => toRecommended(n, i + 1, input, cands));
  return finish(builds);
}

/**
 * Elige N builds priorizando variedad: primero las mejores con pares CPU+GPU distintos;
 * si faltan, completa con las siguientes mejores.
 */
function diversify(sorted: Node[], count: number): Node[] {
  const chosen: Node[] = [];
  const seen = new Set<string>();
  for (const n of sorted) {
    const key = `${n.build.cpu!.id}|${n.build.gpu!.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(n);
    if (chosen.length === count) return chosen;
  }
  for (const n of sorted) {
    if (!chosen.includes(n)) chosen.push(n);
    if (chosen.length === count) break;
  }
  return chosen.sort((a, b) => b.score - a.score);
}

// ───────────── Presentación: justificación en lenguaje natural ─────────────

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function toRecommended(
  n: Node,
  rank: number,
  input: RecommendInput,
  cands: Record<BuildCategory, Product[]>,
): RecommendedBuild {
  const b = n.build;
  const check = checkResolved(b);
  const components = ORDER.flatMap((category) => {
    const items =
      category === 'storage' ? (b.storage ?? []) : [b[category]].filter((x): x is Product => !!x);
    return items.map((product) => ({ category, product }));
  });
  const selection: Selection = {
    cpu: b.cpu!.id,
    motherboard: b.motherboard!.id,
    ram: b.ram!.id,
    gpu: b.gpu!.id,
    psu: b.psu!.id,
    case: b.case!.id,
    cooling: b.cooling!.id,
    storage: (b.storage ?? []).map((s) => s.id),
  };
  return {
    rank,
    score: round2(n.score),
    totalPrice: round2(n.cost),
    remainingBudget: round2(input.budget - n.cost),
    selection,
    components,
    check,
    scoreBreakdown: n.breakdown,
    why: explain(n, input),
    sacrifices: sacrifices(n, input, cands),
  };
}

function explain(n: Node, input: RecommendInput): string {
  const b = n.build;
  const cpu = specsOf<CpuSpecs>(b.cpu!);
  const gpu = specsOf<GpuSpecs>(b.gpu!);
  const ram = specsOf<RamSpecs>(b.ram!);
  const sto = specsOf<StorageSpecs>(b.storage![0]!);
  const power = powerReport(b);
  const used = Math.round((n.cost / input.budget) * 100);
  const focus: Record<UseCase, string> = {
    gaming: `Para gaming, la GPU pesa más en el puntaje: la ${b.gpu!.name} (${gpu.score}/100) concentra el ${Math.round((b.gpu!.price / n.cost) * 100)} % del gasto y la acompaña un ${b.cpu!.name} (${cpu.score}/100) que evita cuello de botella.`,
    video: `Para edición de video se prioriza CPU, RAM y almacenamiento: el ${b.cpu!.name} aporta ${cpu.cores} núcleos / ${cpu.threads} hilos, con ${ram.capacityGB} GB de RAM ${ram.ramType}-${ram.speedMHz} y ${sto.capacityGB} GB ${sto.type}.`,
    programming: `Para programar importan núcleos, memoria y un disco rápido: ${cpu.cores} núcleos con el ${b.cpu!.name}, ${ram.capacityGB} GB de RAM y ${sto.capacityGB} GB ${sto.type} para compilar y mover proyectos sin esperas.`,
    office: `Para ofimática se busca valor: un ${b.cpu!.name} sobrado para tareas diarias, ${ram.capacityGB} GB de RAM y ${sto.capacityGB} GB ${sto.type}, sin pagar de más por una GPU que no necesitas.`,
    streaming: `Para streaming se equilibra CPU y GPU: el ${b.cpu!.name} y la ${b.gpu!.name} reparten la carga de juego y codificación, con ${ram.capacityGB} GB de RAM para multitarea.`,
  };
  const budgetText = `Usa ${usd(n.cost)} de ${usd(input.budget)} (${used} %).`;
  const compat = `Todas las piezas son compatibles entre sí (${b.cpu!.specs.socket}, ${ram.ramType}, formato ${b.motherboard!.specs.formFactor}).`;
  const powerText = `Consumo estimado ${power.estimatedWatts} W con una fuente de ${power.psuWatts} W (${power.headroomPct} % de holgura).`;
  return [focus[input.use], compat, powerText, budgetText].join(' ');
}

/** Qué se sacrifica frente a lo mejor disponible o a lo recomendable para el uso. */
function sacrifices(
  n: Node,
  input: RecommendInput,
  cands: Record<BuildCategory, Product[]>,
): string[] {
  const b = n.build;
  const out: string[] = [];
  const gpu = specsOf<GpuSpecs>(b.gpu!);
  const cpu = specsOf<CpuSpecs>(b.cpu!);
  const ram = specsOf<RamSpecs>(b.ram!);
  const board = specsOf<BoardSpecs>(b.motherboard!);
  const sto = specsOf<StorageSpecs>(b.storage![0]!);
  const power = powerReport(b);

  const bestGpu = cands.gpu.reduce((a, c) =>
    specsOf<GpuSpecs>(c).score > specsOf<GpuSpecs>(a).score ? c : a,
  );
  const bestCpu = cands.cpu.reduce((a, c) =>
    specsOf<CpuSpecs>(c).score > specsOf<CpuSpecs>(a).score ? c : a,
  );
  if (
    (input.use === 'gaming' || input.use === 'streaming') &&
    specsOf<GpuSpecs>(bestGpu).score - gpu.score >= 15
  ) {
    out.push(
      `GPU: la ${bestGpu.name} rinde ${specsOf<GpuSpecs>(bestGpu).score - gpu.score} puntos más, pero no cabe en el presupuesto.`,
    );
  }
  if (
    (input.use === 'video' || input.use === 'programming') &&
    specsOf<CpuSpecs>(bestCpu).score - cpu.score >= 15
  ) {
    out.push(
      `CPU: el ${bestCpu.name} ofrece ${specsOf<CpuSpecs>(bestCpu).score - cpu.score} puntos más de rendimiento, a cambio de un costo mayor.`,
    );
  }
  if (ram.capacityGB < 32 && ['video', 'programming', 'streaming'].includes(input.use)) {
    out.push(
      `RAM: ${ram.capacityGB} GB se queda corto para ${USE_LABELS[input.use]}; conviene ampliar a 32 GB cuando sea posible.`,
    );
  }
  if (sto.capacityGB < 1000 || sto.type === 'HDD') {
    out.push(
      `Almacenamiento: ${sto.capacityGB} GB ${sto.type} es limitado; planea un SSD adicional.`,
    );
  }
  if (board.formFactor !== 'ATX' || board.ramSlots <= 2) {
    out.push(
      `Placa ${board.formFactor}: ${board.ramSlots} ranuras de RAM y ${board.m2Slots} M.2 limitan futuras ampliaciones.`,
    );
  }
  if (power.level === 'tight') {
    out.push(
      `Fuente: la holgura es justa (${power.headroomPct} %); una GPU más potente exigiría cambiarla.`,
    );
  }
  if (out.length === 0) {
    out.push(
      'Sin sacrificios relevantes: la build aprovecha el presupuesto sin renunciar a lo esencial para el uso elegido.',
    );
  }
  return out;
}
