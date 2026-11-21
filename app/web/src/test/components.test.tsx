import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PowerBar } from '../components/PowerBar';
import { ProductArt, artKind } from '../components/ProductArt';
import { ProductCard } from '../components/ProductCard';
import { CartProvider, useCart } from '../state/cart';
import { CompareProvider } from '../state/compare';
import { gpu, ram } from './fixtures';

const wrap = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <CartProvider>
        <CompareProvider>{ui}</CompareProvider>
      </CartProvider>
    </MemoryRouter>,
  );

function CartCount() {
  const { count } = useCart();
  return <output aria-label="items">{count}</output>;
}

describe('ProductCard', () => {
  it('muestra nombre, marca, precio y stock', () => {
    wrap(<ProductCard product={gpu} />);
    expect(screen.getByRole('link', { name: gpu.name, hidden: false })).toBeInTheDocument();
    expect(screen.getByText('$299.00')).toBeInTheDocument();
    expect(screen.getByText('En stock')).toBeInTheDocument();
  });

  it('avisa poco stock y deshabilita agregar si está agotado', () => {
    wrap(<ProductCard product={{ ...ram, stock: 0 }} />);
    expect(screen.getByText('Agotado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
  });

  it('agrega al carrito al pulsar "Agregar"', async () => {
    wrap(
      <>
        <ProductCard product={gpu} />
        <CartCount />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByLabelText('items')).toHaveTextContent('1');
  });

  it('alterna el botón de comparar (aria-pressed)', async () => {
    wrap(<ProductCard product={gpu} />);
    const btn = screen.getByRole('button', { name: /Comparar/ });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /Quitar de la comparación/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('PowerBar', () => {
  const base = {
    estimatedWatts: 360,
    recommendedWatts: 500,
    psuWatts: 750,
    ratio: 2.08,
    headroomPct: 108,
    level: 'ample' as const,
  };

  it('muestra el consumo frente a la fuente y la holgura', () => {
    render(<PowerBar power={base} />);
    expect(screen.getByText('360 W / 750 W')).toBeInTheDocument();
    expect(screen.getByText('Amplia')).toBeInTheDocument();
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '360');
  });

  it('sin fuente recomienda una potencia', () => {
    render(
      <PowerBar power={{ ...base, psuWatts: null, ratio: null, headroomPct: null, level: null }} />,
    );
    expect(screen.getByText('500 W')).toBeInTheDocument();
  });

  it('marca el nivel insuficiente', () => {
    const { container } = render(
      <PowerBar power={{ ...base, psuWatts: 400, level: 'insufficient', headroomPct: 11 }} />,
    );
    expect(container.querySelector('.power--insufficient')).not.toBeNull();
  });
});

describe('ProductArt', () => {
  it('elige la ilustración según categoría y specs', () => {
    expect(artKind({ category: 'storage', specs: { type: 'HDD' }, tags: [] })).toBe('hdd');
    expect(artKind({ category: 'storage', specs: { type: 'NVMe' }, tags: [] })).toBe('nvme');
    expect(artKind({ category: 'audio', specs: {}, tags: ['airpods'] })).toBe('earbuds');
    expect(artKind({ category: 'peripherals', specs: { type: 'Monitor' }, tags: [] })).toBe(
      'monitor',
    );
  });

  it('es accesible: expone rol img con etiqueta', () => {
    render(<ProductArt product={gpu} />);
    expect(screen.getByRole('img', { name: `Ilustración de ${gpu.name}` })).toBeInTheDocument();
  });
});
