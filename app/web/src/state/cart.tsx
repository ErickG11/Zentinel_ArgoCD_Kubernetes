import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type { Product } from '../api/types';

export interface CartItem {
  productId: string;
  name: string;
  brand: string;
  category: Product['category'];
  price: number;
  qty: number;
  stock: number;
}

export type CartAction =
  | { type: 'add'; product: Product; qty?: number }
  | { type: 'addMany'; products: Product[] }
  | { type: 'setQty'; productId: string; qty: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

const MAX_QTY = 10;
const toItem = (p: Product, qty: number): CartItem => ({
  productId: p.id,
  name: p.name,
  brand: p.brand,
  category: p.category,
  price: p.price,
  qty,
  stock: p.stock,
});

export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const qty = action.qty ?? 1;
      const found = state.find((i) => i.productId === action.product.id);
      if (!found)
        return [...state, toItem(action.product, Math.min(qty, action.product.stock, MAX_QTY))];
      return state.map((i) =>
        i.productId === found.productId
          ? { ...i, qty: Math.min(i.qty + qty, i.stock, MAX_QTY) }
          : i,
      );
    }
    case 'addMany':
      return action.products.reduce((s, p) => cartReducer(s, { type: 'add', product: p }), state);
    case 'setQty':
      return state
        .map((i) =>
          i.productId === action.productId
            ? { ...i, qty: Math.min(action.qty, i.stock, MAX_QTY) }
            : i,
        )
        .filter((i) => i.qty > 0);
    case 'remove':
      return state.filter((i) => i.productId !== action.productId);
    case 'clear':
      return [];
  }
}

export const cartSubtotal = (items: CartItem[]): number =>
  Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
export const cartCount = (items: CartItem[]): number => items.reduce((s, i) => s + i.qty, 0);

const KEY = 'zs-cart';
function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  dispatch: (a: CartAction) => void;
}
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, load);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible: el carrito sigue en memoria */
    }
  }, [items]);
  const value = useMemo(
    () => ({
      items,
      count: cartCount(items),
      subtotal: cartSubtotal(items),
      open,
      setOpen,
      dispatch,
    }),
    [items, open],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return c;
}
