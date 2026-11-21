import type {
  Category,
  CheckResult,
  CompareResult,
  OrderLine,
  OrderOptions,
  OrderPayload,
  OrderTotals,
  PaymentMethod,
  Customer,
  Preferences,
  Product,
  ProductPage,
  Receipt,
  RecommendResult,
  Selection,
  SystemInfo,
  UseCase,
} from './types';

/** Error de API con el formato { error: { code, message, details } } del servidor. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err = (body?.error ?? body) as {
      code?: string;
      message?: string;
      details?: ApiError['details'];
    } | null;
    throw new ApiError(
      res.status,
      err?.code ?? 'ERROR',
      err?.message ?? `Error ${res.status}`,
      err?.details,
    );
  }
  return body as T;
}

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== false) u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
};

export interface ProductFilters {
  q?: string;
  category?: string;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export const api = {
  products: (f: ProductFilters) =>
    request<ProductPage>(`/products${qs({ ...f, brand: f.brand?.join(',') })}`),
  suggest: (q: string) =>
    request<{ suggestions: { id: string; name: string; category: string }[] }>(
      `/products/suggest${qs({ q })}`,
    ),
  product: (id: string) => request<Product>(`/products/${encodeURIComponent(id)}`),
  related: (id: string) =>
    request<{ items: Product[] }>(`/products/${encodeURIComponent(id)}/related`),
  categories: () => request<{ items: Category[] }>('/categories'),
  compare: (ids: string[]) => request<CompareResult>(`/compare${qs({ ids: ids.join(',') })}`),
  check: (sel: Selection) =>
    request<CheckResult>('/builder/check', { method: 'POST', body: JSON.stringify(sel) }),
  recommend: (body: { budget: number; use: UseCase; preferences: Preferences; count?: number }) =>
    request<RecommendResult>('/builder/recommend', { method: 'POST', body: JSON.stringify(body) }),
  orderOptions: () => request<OrderOptions>('/orders/options'),
  quote: (body: { items: { productId: string; qty: number }[]; city: string }) =>
    request<{ lines: OrderLine[]; totals: OrderTotals }>('/orders/quote', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createOrder: (body: {
    customer: Customer;
    items: { productId: string; qty: number }[];
    paymentMethod: PaymentMethod;
  }) => request<Receipt>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  verifyOrder: (token: string) =>
    request<{ valid: true; order: OrderPayload }>(`/orders/verify/${encodeURIComponent(token)}`),
  systemInfo: () => request<SystemInfo>('/system/info', { cache: 'no-store' }),
};
