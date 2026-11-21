import type { SpecValue } from '../api/types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const formatPrice = (n: number): string => usd.format(n);

export function formatSpec(value: SpecValue | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') {
    const n = Number.isInteger(value) ? value.toLocaleString('es-EC') : String(value);
    return unit ? `${n} ${unit}` : n;
  }
  return unit ? `${value} ${unit}` : value;
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  ram: 'Memoria RAM',
  cpu: 'Procesadores',
  gpu: 'Tarjetas gráficas',
  motherboard: 'Placas madre',
  storage: 'Almacenamiento',
  psu: 'Fuentes de poder',
  case: 'Cases',
  cooling: 'Refrigeración',
  audio: 'Audio y auriculares',
  cables: 'Cables y adaptadores',
  chargers: 'Cargadores y power banks',
  peripherals: 'Periféricos',
  laptops: 'Laptops',
  'phone-accessories': 'Accesorios de celular',
};

export const BUILD_STEPS = [
  { key: 'cpu', label: 'Procesador' },
  { key: 'motherboard', label: 'Placa madre' },
  { key: 'ram', label: 'Memoria RAM' },
  { key: 'gpu', label: 'Tarjeta gráfica' },
  { key: 'storage', label: 'Almacenamiento' },
  { key: 'psu', label: 'Fuente de poder' },
  { key: 'case', label: 'Case' },
  { key: 'cooling', label: 'Refrigeración' },
] as const;

export const PAYMENT_LABEL: Record<string, string> = {
  transfer: 'Transferencia bancaria',
  card_sim: 'Tarjeta (simulada)',
  cash_on_delivery: 'Contra entrega',
};
