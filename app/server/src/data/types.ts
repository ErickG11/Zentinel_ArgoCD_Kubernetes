import { z } from 'zod';

export const CATEGORY_SLUGS = [
  'ram',
  'cpu',
  'gpu',
  'motherboard',
  'storage',
  'psu',
  'case',
  'cooling',
  'audio',
  'cables',
  'chargers',
  'peripherals',
  'laptops',
  'phone-accessories',
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** Categorías que participan en el Armador de PC. */
export const BUILD_CATEGORIES = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
  'cooling',
] as const;
export type BuildCategory = (typeof BUILD_CATEGORIES)[number];

const specValue = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);
export type SpecValue = z.infer<typeof specValue>;

const base = z.object({
  id: z.string().min(2),
  sku: z.string().min(4),
  name: z.string().min(3),
  brand: z.string().min(2),
  category: z.enum(CATEGORY_SLUGS),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  rating: z.number().min(0).max(5),
  description: z.string().min(10),
  specs: z.record(specValue),
  tags: z.array(z.string()),
});

const socket = z.enum(['AM4', 'AM5', 'LGA1700']);
const ramType = z.enum(['DDR4', 'DDR5']);
const formFactor = z.enum(['ATX', 'mATX', 'ITX']);

/** Especificaciones obligatorias por categoría de componente (consistencia del Armador). */
const specsByCategory: Partial<Record<CategorySlug, z.ZodTypeAny>> = {
  cpu: z.object({
    socket,
    cores: z.number().int(),
    threads: z.number().int(),
    tdp: z.number(),
    score: z.number().min(0).max(100),
    baseGhz: z.number(),
    boostGhz: z.number(),
  }),
  motherboard: z.object({
    socket,
    chipset: z.string(),
    ramType,
    formFactor,
    ramSlots: z.number().int(),
    maxRamGB: z.number(),
    m2Slots: z.number().int(),
  }),
  ram: z.object({
    ramType,
    capacityGB: z.number(),
    modules: z.number().int(),
    speedMHz: z.number(),
    latencyCL: z.number(),
  }),
  gpu: z.object({
    tdp: z.number(),
    lengthMm: z.number(),
    score: z.number().min(0).max(100),
    vramGB: z.number(),
    chip: z.string(),
  }),
  psu: z.object({
    watts: z.number(),
    efficiency: z.string(),
    modular: z.string(),
  }),
  case: z.object({
    formFactors: z.array(formFactor).min(1),
    maxGpuMm: z.number(),
    maxCoolerMm: z.number(),
    fans: z.number().int(),
  }),
  storage: z.object({
    type: z.enum(['NVMe', 'SATA SSD', 'HDD']),
    capacityGB: z.number(),
    readMBs: z.number(),
  }),
  cooling: z.object({
    kind: z.enum(['Aire', 'Líquida']),
    tdpRating: z.number(),
    heightMm: z.number(),
    sockets: z.array(socket).min(1),
    noiseDb: z.number(),
  }),
};

export const productSchema = base.superRefine((p, ctx) => {
  const spec = specsByCategory[p.category];
  if (!spec) return;
  const r = spec.safeParse(p.specs);
  if (!r.success) {
    for (const issue of r.error.issues) {
      ctx.addIssue({ ...issue, path: ['specs', ...issue.path] });
    }
  }
});

export type Product = z.infer<typeof base>;

/** Vistas tipadas de specs (ya validadas al cargar el catálogo). */
export interface CpuSpecs {
  socket: string;
  cores: number;
  threads: number;
  tdp: number;
  score: number;
}
export interface BoardSpecs {
  socket: string;
  chipset: string;
  ramType: string;
  formFactor: string;
  ramSlots: number;
  maxRamGB: number;
  m2Slots: number;
}
export interface RamSpecs {
  ramType: string;
  capacityGB: number;
  modules: number;
  speedMHz: number;
}
export interface GpuSpecs {
  tdp: number;
  lengthMm: number;
  score: number;
  vramGB: number;
}
export interface PsuSpecs {
  watts: number;
  efficiency: string;
}
export interface CaseSpecs {
  formFactors: string[];
  maxGpuMm: number;
  maxCoolerMm: number;
  fans: number;
}
export interface StorageSpecs {
  type: string;
  capacityGB: number;
  readMBs: number;
}
export interface CoolerSpecs {
  kind: string;
  tdpRating: number;
  heightMm: number;
  sockets: string[];
  noiseDb: number;
}

export const specsOf = <T>(p: Product): T => p.specs as unknown as T;
