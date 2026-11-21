import { describe, expect, it } from 'vitest';
import { cartCount, cartReducer, cartSubtotal, type CartItem } from '../state/cart';
import { gpu, ram } from './fixtures';

describe('carrito', () => {
  it('agrega productos y acumula cantidad del mismo producto', () => {
    let s: CartItem[] = [];
    s = cartReducer(s, { type: 'add', product: gpu });
    s = cartReducer(s, { type: 'add', product: gpu });
    expect(s).toHaveLength(1);
    expect(s[0]!.qty).toBe(2);
  });

  it('respeta el stock disponible', () => {
    let s: CartItem[] = [];
    s = cartReducer(s, { type: 'add', product: ram, qty: 9 });
    expect(s[0]!.qty).toBe(3);
    s = cartReducer(s, { type: 'setQty', productId: ram.id, qty: 8 });
    expect(s[0]!.qty).toBe(3);
  });

  it('elimina la línea al llegar a cantidad 0 y permite quitar y vaciar', () => {
    let s = cartReducer([], { type: 'addMany', products: [gpu, ram] });
    expect(s).toHaveLength(2);
    s = cartReducer(s, { type: 'setQty', productId: gpu.id, qty: 0 });
    expect(s.map((i) => i.productId)).toEqual([ram.id]);
    s = cartReducer(s, { type: 'remove', productId: ram.id });
    expect(s).toEqual([]);
    expect(cartReducer(cartReducer([], { type: 'add', product: gpu }), { type: 'clear' })).toEqual(
      [],
    );
  });

  it('calcula subtotal y cantidad total', () => {
    const s = cartReducer(cartReducer([], { type: 'add', product: gpu, qty: 2 }), {
      type: 'add',
      product: ram,
    });
    expect(cartSubtotal(s)).toBe(2 * 299 + 42);
    expect(cartCount(s)).toBe(3);
  });
});
