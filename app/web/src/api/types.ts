export type CategorySlug =
  | 'ram'
  | 'cpu'
  | 'gpu'
  | 'motherboard'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cooling'
  | 'audio'
  | 'cables'
  | 'chargers'
  | 'peripherals'
  | 'laptops'
  | 'phone-accessories';

export type BuildCategory =
  'cpu' | 'motherboard' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case' | 'cooling';

export type SpecValue = string | number | boolean | string[];

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: CategorySlug;
  price: number;
  stock: number;
  rating: number;
  description: string;
  specs: Record<string, SpecValue>;
  tags: string[];
}

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  count: number;
  fromPrice: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  didYouMean?: string;
  facets: {
    brands: { name: string; count: number }[];
    categories: { slug: CategorySlug; name: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

export type Rank = 'best' | 'worst' | 'neutral';
export interface CompareRow {
  key: string;
  label: string;
  unit?: string;
  better?: 'higher' | 'lower';
  values: { productId: string; value: SpecValue | null; rank: Rank }[];
  identical: boolean;
}
export interface CompareResult {
  category: CategorySlug;
  products: Product[];
  rows: CompareRow[];
  winnerId: string | null;
}

export type Severity = 'error' | 'warning' | 'info';
export interface Issue {
  code: string;
  severity: Severity;
  message: string;
  components: BuildCategory[];
}
export type PowerLevel = 'insufficient' | 'tight' | 'adequate' | 'ample';
export interface PowerReport {
  estimatedWatts: number;
  recommendedWatts: number;
  psuWatts: number | null;
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

export type UseCase = 'gaming' | 'video' | 'programming' | 'office' | 'streaming';
export interface Preferences {
  cpuBrand: 'any' | 'amd' | 'intel';
  gpuBrand: 'any' | 'nvidia' | 'amd';
  size: 'any' | 'compact';
  noise: 'any' | 'quiet';
  upgradeability: 'any' | 'high';
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

export interface OrderTotals {
  subtotal: number;
  comboDiscount: number;
  comboApplied: boolean;
  taxableBase: number;
  shipping: number;
  iva: number;
  total: number;
}
export interface OrderLine {
  productId: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}
export type PaymentMethod = 'transfer' | 'card_sim' | 'cash_on_delivery';
export interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}
export interface OrderPayload {
  code: string;
  issuedAt: string;
  customer: Customer;
  paymentMethod: PaymentMethod;
  lines: OrderLine[];
  totals: OrderTotals;
}
export interface Receipt {
  code: string;
  token: string;
  order: OrderPayload;
}
export interface OrderOptions {
  cities: { name: string; shipping: number }[];
  paymentMethods: PaymentMethod[];
  ivaRate: number;
}

export interface SystemInfo {
  pod: string;
  version: string;
  environment: string;
  namespace: string;
  commit: string;
  uptimeSeconds: number;
  startedAt: string;
  requestsServed: number;
  node: string;
  timestamp: string;
}
