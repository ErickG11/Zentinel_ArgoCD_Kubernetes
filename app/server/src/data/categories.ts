import type { CategorySlug } from './types';

export interface CategoryInfo {
  slug: CategorySlug;
  name: string;
  description: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { slug: 'ram', name: 'Memoria RAM', description: 'Kits DDR4 y DDR5 para escritorio' },
  { slug: 'cpu', name: 'Procesadores', description: 'AMD Ryzen e Intel Core' },
  {
    slug: 'gpu',
    name: 'Tarjetas gráficas',
    description: 'GeForce y Radeon para gaming y creación',
  },
  { slug: 'motherboard', name: 'Placas madre', description: 'AM4, AM5 y LGA1700' },
  { slug: 'storage', name: 'Almacenamiento', description: 'SSD NVMe, SATA y discos duros' },
  { slug: 'psu', name: 'Fuentes de poder', description: 'Eficiencia 80 Plus de 550 W a 1000 W' },
  { slug: 'case', name: 'Cases', description: 'Gabinetes ATX, mATX e ITX' },
  { slug: 'cooling', name: 'Refrigeración', description: 'Disipadores por aire y líquida AIO' },
  { slug: 'audio', name: 'Audio y auriculares', description: 'AirPods, diademas y gaming' },
  { slug: 'cables', name: 'Cables y adaptadores', description: 'HDMI, DisplayPort, USB-C y hubs' },
  {
    slug: 'chargers',
    name: 'Cargadores y power banks',
    description: 'GaN, inalámbricos y baterías',
  },
  { slug: 'peripherals', name: 'Periféricos', description: 'Teclados, mouse y monitores' },
  { slug: 'laptops', name: 'Laptops', description: 'Ultrabooks y gaming portátil' },
  {
    slug: 'phone-accessories',
    name: 'Accesorios de celular',
    description: 'Fundas, vidrios y soportes',
  },
];

export const categoryName = (slug: CategorySlug): string =>
  CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

export interface SpecMeta {
  label: string;
  unit?: string;
  /** Qué dirección es "mejor" al comparar; sin valor = informativo. */
  better?: 'higher' | 'lower';
}

/** Metadatos de specs por categoría: etiquetas y criterio de mejor/peor valor. */
export const SPEC_META: Partial<Record<CategorySlug, Record<string, SpecMeta>>> = {
  cpu: {
    socket: { label: 'Socket' },
    cores: { label: 'Núcleos', better: 'higher' },
    threads: { label: 'Hilos', better: 'higher' },
    baseGhz: { label: 'Frecuencia base', unit: 'GHz', better: 'higher' },
    boostGhz: { label: 'Frecuencia turbo', unit: 'GHz', better: 'higher' },
    tdp: { label: 'TDP', unit: 'W', better: 'lower' },
    score: { label: 'Rendimiento', unit: '/100', better: 'higher' },
  },
  gpu: {
    chip: { label: 'Chip' },
    vramGB: { label: 'VRAM', unit: 'GB', better: 'higher' },
    tdp: { label: 'TDP', unit: 'W', better: 'lower' },
    lengthMm: { label: 'Largo', unit: 'mm', better: 'lower' },
    score: { label: 'Rendimiento', unit: '/100', better: 'higher' },
  },
  ram: {
    ramType: { label: 'Tipo' },
    capacityGB: { label: 'Capacidad', unit: 'GB', better: 'higher' },
    modules: { label: 'Módulos' },
    speedMHz: { label: 'Velocidad', unit: 'MHz', better: 'higher' },
    latencyCL: { label: 'Latencia CL', better: 'lower' },
  },
  motherboard: {
    socket: { label: 'Socket' },
    chipset: { label: 'Chipset' },
    ramType: { label: 'Tipo de RAM' },
    formFactor: { label: 'Formato' },
    ramSlots: { label: 'Ranuras RAM', better: 'higher' },
    maxRamGB: { label: 'RAM máxima', unit: 'GB', better: 'higher' },
    m2Slots: { label: 'Ranuras M.2', better: 'higher' },
  },
  storage: {
    type: { label: 'Tipo' },
    capacityGB: { label: 'Capacidad', unit: 'GB', better: 'higher' },
    readMBs: { label: 'Lectura', unit: 'MB/s', better: 'higher' },
  },
  psu: {
    watts: { label: 'Potencia', unit: 'W', better: 'higher' },
    efficiency: { label: 'Certificación' },
    modular: { label: 'Modularidad' },
  },
  case: {
    formFactors: { label: 'Formatos soportados' },
    maxGpuMm: { label: 'GPU máxima', unit: 'mm', better: 'higher' },
    maxCoolerMm: { label: 'Cooler máximo', unit: 'mm', better: 'higher' },
    fans: { label: 'Ventiladores incluidos', better: 'higher' },
  },
  cooling: {
    kind: { label: 'Tipo' },
    tdpRating: { label: 'Capacidad térmica', unit: 'W', better: 'higher' },
    heightMm: { label: 'Altura', unit: 'mm', better: 'lower' },
    noiseDb: { label: 'Ruido', unit: 'dB', better: 'lower' },
    sockets: { label: 'Sockets' },
  },
  laptops: {
    screenIn: { label: 'Pantalla', unit: '"' },
    ramGB: { label: 'RAM', unit: 'GB', better: 'higher' },
    storageGB: { label: 'Almacenamiento', unit: 'GB', better: 'higher' },
    weightKg: { label: 'Peso', unit: 'kg', better: 'lower' },
    batteryWh: { label: 'Batería', unit: 'Wh', better: 'higher' },
  },
  peripherals: {
    sizeIn: { label: 'Tamaño', unit: '"' },
    refreshHz: { label: 'Frecuencia', unit: 'Hz', better: 'higher' },
    dpi: { label: 'DPI máx.', better: 'higher' },
  },
  audio: {
    batteryH: { label: 'Autonomía', unit: 'h', better: 'higher' },
    anc: { label: 'Cancelación de ruido' },
    weightG: { label: 'Peso', unit: 'g', better: 'lower' },
  },
  chargers: {
    watts: { label: 'Potencia', unit: 'W', better: 'higher' },
    capacityMah: { label: 'Capacidad', unit: 'mAh', better: 'higher' },
  },
};
