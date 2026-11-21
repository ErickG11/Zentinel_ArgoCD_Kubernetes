import { getProduct } from '../data/catalog';
import {
  BUILD_CATEGORIES,
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
import { unprocessable } from '../lib/errors';
import { round2 } from '../lib/text';

/**
 * Motor de compatibilidad del Armador de PC. Cada regla es una función pura con
 * un código estable, severidad y mensaje claro en español.
 */

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  code: string;
  severity: Severity;
  message: string;
  components: BuildCategory[];
}

/** Componentes ya resueltos (objetos de catálogo). */
export interface Build {
  cpu?: Product;
  motherboard?: Product;
  ram?: Product;
  gpu?: Product;
  psu?: Product;
  case?: Product;
  cooling?: Product;
  storage?: Product[];
}

/** Selección por ids, tal como llega por la API. */
export interface Selection {
  cpu?: string;
  motherboard?: string;
  ram?: string;
  gpu?: string;
  psu?: string;
  case?: string;
  cooling?: string;
  storage?: string[];
}

/** Piezas imprescindibles para considerar la build completa (el cooler es opcional). */
export const REQUIRED_CATEGORIES: BuildCategory[] = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
];

/** Consumo base estimado de placa, RAM, almacenamiento y ventiladores (W). */
export const BASE_SYSTEM_WATTS = 75;

export type PowerLevel = 'insufficient' | 'tight' | 'adequate' | 'ample';

export interface PowerReport {
  estimatedWatts: number;
  recommendedWatts: number;
  psuWatts: number | null;
  /** psuWatts / estimatedWatts (p. ej. 1.5 = 50 % de holgura). */
  ratio: number | null;
  headroomPct: number | null;
  level: PowerLevel | null;
}

export interface CheckResult {
  compatible: boolean;
  complete: boolean;
  missing: BuildCategory[];
  issues: Issue[];
  power: PowerReport;
  price: {
    total: number;
    breakdown: { category: BuildCategory; productId: string; name: string; price: number }[];
  };
}

const issue = (
  code: string,
  severity: Severity,
  message: string,
  components: BuildCategory[],
): Issue => ({ code, severity, message, components });

// ───────────── Resolución de ids ─────────────

/** Convierte ids en productos, validando existencia y categoría. */
export function resolveSelection(sel: Selection): Build {
  const build: Build = {};
  const one = (cat: BuildCategory, id: string | undefined): Product | undefined => {
    if (!id) return undefined;
    const p = getProduct(id);
    if (!p) throw unprocessable(`El producto "${id}" no existe`);
    if (p.category !== cat) {
      throw unprocessable(`El producto "${p.name}" no es un componente de tipo "${cat}"`);
    }
    return p;
  };
  for (const cat of BUILD_CATEGORIES) {
    if (cat === 'storage') continue;
    const p = one(cat, sel[cat]);
    if (p) build[cat] = p;
  }
  if (sel.storage?.length) {
    build.storage = sel.storage.map((id) => one('storage', id)!);
  }
  return build;
}

// ───────────── Reglas ─────────────

type Rule = (b: Build) => Issue[];

const socketRule: Rule = ({ cpu, motherboard }) => {
  if (!cpu || !motherboard) return [];
  const c = specsOf<CpuSpecs>(cpu);
  const m = specsOf<BoardSpecs>(motherboard);
  return c.socket === m.socket
    ? []
    : [
        issue(
          'SOCKET_MISMATCH',
          'error',
          `El procesador usa socket ${c.socket} pero la placa es ${m.socket}: no son compatibles.`,
          ['cpu', 'motherboard'],
        ),
      ];
};

const ramTypeRule: Rule = ({ ram, motherboard }) => {
  if (!ram || !motherboard) return [];
  const r = specsOf<RamSpecs>(ram);
  const m = specsOf<BoardSpecs>(motherboard);
  return r.ramType === m.ramType
    ? []
    : [
        issue(
          'RAM_TYPE_MISMATCH',
          'error',
          `La memoria es ${r.ramType} pero la placa solo admite ${m.ramType}.`,
          ['ram', 'motherboard'],
        ),
      ];
};

const ramCapacityRule: Rule = ({ ram, motherboard }) => {
  if (!ram || !motherboard) return [];
  const r = specsOf<RamSpecs>(ram);
  const m = specsOf<BoardSpecs>(motherboard);
  const out: Issue[] = [];
  if (r.modules > m.ramSlots) {
    out.push(
      issue(
        'RAM_SLOTS_EXCEEDED',
        'error',
        `El kit tiene ${r.modules} módulos pero la placa solo tiene ${m.ramSlots} ranuras de RAM.`,
        ['ram', 'motherboard'],
      ),
    );
  }
  if (r.capacityGB > m.maxRamGB) {
    out.push(
      issue(
        'RAM_CAPACITY_EXCEEDED',
        'error',
        `La placa admite hasta ${m.maxRamGB} GB de RAM y el kit es de ${r.capacityGB} GB.`,
        ['ram', 'motherboard'],
      ),
    );
  }
  return out;
};

const formFactorRule: Rule = ({ motherboard, case: pcCase }) => {
  if (!motherboard || !pcCase) return [];
  const m = specsOf<BoardSpecs>(motherboard);
  const c = specsOf<CaseSpecs>(pcCase);
  return c.formFactors.includes(m.formFactor)
    ? []
    : [
        issue(
          'FORM_FACTOR_MISMATCH',
          'error',
          `La placa es ${m.formFactor} pero el case solo soporta ${c.formFactors.join(', ')}.`,
          ['motherboard', 'case'],
        ),
      ];
};

const gpuLengthRule: Rule = ({ gpu, case: pcCase }) => {
  if (!gpu || !pcCase) return [];
  const g = specsOf<GpuSpecs>(gpu);
  const c = specsOf<CaseSpecs>(pcCase);
  if (g.lengthMm > c.maxGpuMm) {
    return [
      issue(
        'GPU_TOO_LONG',
        'error',
        `La tarjeta gráfica mide ${g.lengthMm} mm y el case admite hasta ${c.maxGpuMm} mm.`,
        ['gpu', 'case'],
      ),
    ];
  }
  if (c.maxGpuMm - g.lengthMm <= 15) {
    return [
      issue(
        'GPU_TIGHT_FIT',
        'warning',
        `La GPU (${g.lengthMm} mm) entra muy justa en el case (máx. ${c.maxGpuMm} mm): revisa el flujo de aire.`,
        ['gpu', 'case'],
      ),
    ];
  }
  return [];
};

const coolerRule: Rule = ({ cooling, cpu, case: pcCase }) => {
  if (!cooling) return [];
  const k = specsOf<CoolerSpecs>(cooling);
  const out: Issue[] = [];
  if (cpu) {
    const c = specsOf<CpuSpecs>(cpu);
    if (!k.sockets.includes(c.socket)) {
      out.push(
        issue(
          'COOLER_SOCKET_MISMATCH',
          'error',
          `El cooler no es compatible con el socket ${c.socket} del procesador.`,
          ['cooling', 'cpu'],
        ),
      );
    }
    if (k.tdpRating < c.tdp) {
      out.push(
        issue(
          'COOLER_UNDERPOWERED',
          'warning',
          `El cooler disipa ${k.tdpRating} W y el procesador consume hasta ${c.tdp} W: habrá temperaturas altas.`,
          ['cooling', 'cpu'],
        ),
      );
    }
  }
  if (pcCase) {
    const c = specsOf<CaseSpecs>(pcCase);
    if (k.kind === 'Aire' && k.heightMm > c.maxCoolerMm) {
      out.push(
        issue(
          'COOLER_TOO_TALL',
          'error',
          `El cooler mide ${k.heightMm} mm de alto y el case admite hasta ${c.maxCoolerMm} mm.`,
          ['cooling', 'case'],
        ),
      );
    }
  }
  return out;
};

const m2Rule: Rule = ({ storage, motherboard }) => {
  if (!storage?.length || !motherboard) return [];
  const m = specsOf<BoardSpecs>(motherboard);
  const nvme = storage.filter((s) => specsOf<StorageSpecs>(s).type === 'NVMe').length;
  return nvme > m.m2Slots
    ? [
        issue(
          'M2_SLOTS_EXCEEDED',
          'error',
          `Elegiste ${nvme} unidades NVMe pero la placa tiene ${m.m2Slots} ranura(s) M.2.`,
          ['storage', 'motherboard'],
        ),
      ]
    : [];
};

// ───────────── Consumo ─────────────

export function powerReport(b: Build): PowerReport {
  const cpuW = b.cpu ? specsOf<CpuSpecs>(b.cpu).tdp : 0;
  const gpuW = b.gpu ? specsOf<GpuSpecs>(b.gpu).tdp : 0;
  const estimatedWatts = cpuW + gpuW + BASE_SYSTEM_WATTS;
  const recommendedWatts = Math.ceil((estimatedWatts * 1.3) / 50) * 50;
  const psuWatts = b.psu ? specsOf<PsuSpecs>(b.psu).watts : null;
  if (psuWatts === null) {
    return {
      estimatedWatts,
      recommendedWatts,
      psuWatts,
      ratio: null,
      headroomPct: null,
      level: null,
    };
  }
  const ratio = psuWatts / estimatedWatts;
  const level: PowerLevel =
    ratio < 1.1 ? 'insufficient' : ratio < 1.3 ? 'tight' : ratio < 1.8 ? 'adequate' : 'ample';
  return {
    estimatedWatts,
    recommendedWatts,
    psuWatts,
    ratio: round2(ratio),
    headroomPct: Math.round((ratio - 1) * 100),
    level,
  };
}

const powerRule: Rule = (b) => {
  if (!b.psu || (!b.cpu && !b.gpu)) return [];
  const p = powerReport(b);
  const base = `Consumo estimado ${p.estimatedWatts} W frente a una fuente de ${p.psuWatts} W`;
  switch (p.level) {
    case 'insufficient':
      return [
        issue(
          'PSU_INSUFFICIENT',
          'error',
          `${base}: insuficiente. Se recomiendan al menos ${p.recommendedWatts} W.`,
          ['psu'],
        ),
      ];
    case 'tight':
      return [
        issue(
          'PSU_TIGHT',
          'warning',
          `${base}: holgura justa (${p.headroomPct} %). Se recomiendan ${p.recommendedWatts} W para trabajar tranquilo.`,
          ['psu'],
        ),
      ];
    case 'ample':
      return [
        issue(
          'PSU_AMPLE',
          'info',
          `${base}: holgura amplia (${p.headroomPct} %), ideal para ampliar la build.`,
          ['psu'],
        ),
      ];
    default:
      return [];
  }
};

// ───────────── Cuello de botella ─────────────

const bottleneckRule: Rule = ({ cpu, gpu }) => {
  if (!cpu || !gpu) return [];
  const c = specsOf<CpuSpecs>(cpu).score;
  const g = specsOf<GpuSpecs>(gpu).score;
  if (g - c > 25) {
    return [
      issue(
        'CPU_BOTTLENECK',
        'warning',
        `Posible cuello de botella: el procesador (${c}/100) limitará a la GPU (${g}/100). Considera un CPU más potente.`,
        ['cpu', 'gpu'],
      ),
    ];
  }
  if (c - g > 35) {
    return [
      issue(
        'GPU_BOTTLENECK',
        'warning',
        `Posible cuello de botella: la GPU (${g}/100) está por debajo del procesador (${c}/100) para gaming. Prioriza una gráfica mejor.`,
        ['cpu', 'gpu'],
      ),
    ];
  }
  return [];
};

const RULES: Rule[] = [
  socketRule,
  ramTypeRule,
  ramCapacityRule,
  formFactorRule,
  gpuLengthRule,
  coolerRule,
  m2Rule,
  powerRule,
  bottleneckRule,
];

/** Todas las incidencias de la build (errores primero). */
export function evaluate(b: Build): Issue[] {
  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return RULES.flatMap((r) => r(b)).sort((a, z) => order[a.severity] - order[z.severity]);
}

/** true si la build parcial no tiene ningún error duro (usado por el recomendador). */
export function hasHardConflict(b: Build): boolean {
  return RULES.some((r) => r(b).some((i) => i.severity === 'error'));
}

export function buildTotal(b: Build): number {
  const parts = [
    b.cpu,
    b.motherboard,
    b.ram,
    b.gpu,
    b.psu,
    b.case,
    b.cooling,
    ...(b.storage ?? []),
  ];
  return round2(parts.reduce((sum, p) => sum + (p?.price ?? 0), 0));
}

/** Verifica una configuración completa o parcial. */
export function checkBuild(sel: Selection): CheckResult {
  return checkResolved(resolveSelection(sel));
}

export function checkResolved(b: Build): CheckResult {
  const issues = evaluate(b);
  const missing = REQUIRED_CATEGORIES.filter((c) =>
    c === 'storage' ? !b.storage?.length : !b[c as Exclude<BuildCategory, 'storage'>],
  );
  const breakdown: CheckResult['price']['breakdown'] = [];
  for (const cat of BUILD_CATEGORIES) {
    const items = cat === 'storage' ? (b.storage ?? []) : [b[cat]].filter((x): x is Product => !!x);
    for (const p of items) {
      breakdown.push({ category: cat, productId: p.id, name: p.name, price: p.price });
    }
  }
  return {
    compatible: !issues.some((i) => i.severity === 'error'),
    complete: missing.length === 0,
    missing,
    issues,
    power: powerReport(b),
    price: { total: buildTotal(b), breakdown },
  };
}
