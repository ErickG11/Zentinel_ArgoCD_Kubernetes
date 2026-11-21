import { describe, expect, it } from 'vitest';
import { checkBuild } from '../src/services/compat';
import { recommendBuilds, type RecommendInput } from '../src/services/recommend';

const any = {
  cpuBrand: 'any',
  gpuBrand: 'any',
  size: 'any',
  noise: 'any',
  upgradeability: 'any',
} as const;
const input = (over: Partial<RecommendInput> = {}): RecommendInput => ({
  budget: 1500,
  use: 'gaming',
  preferences: any,
  count: 3,
  ...over,
});

describe('recomendador de builds', () => {
  it('devuelve builds compatibles, dentro del presupuesto y ordenadas por score', () => {
    const r = recommendBuilds(input(), 50_000);
    expect(r.builds.length).toBeGreaterThan(0);
    for (const b of r.builds) {
      expect(b.totalPrice).toBeLessThanOrEqual(1500);
      const check = checkBuild(b.selection);
      expect(check.compatible).toBe(true);
      expect(check.complete).toBe(true);
      expect(b.why.length).toBeGreaterThan(40);
      expect(b.sacrifices.length).toBeGreaterThan(0);
    }
    const scores = r.builds.map((b) => b.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('gaming pondera la GPU más que ofimática', () => {
    const gaming = recommendBuilds(input({ budget: 1400, use: 'gaming' }), 50_000).builds[0]!;
    const office = recommendBuilds(input({ budget: 1400, use: 'office' }), 50_000).builds[0]!;
    const gpuScore = (b: typeof gaming) =>
      b.components.find((c) => c.category === 'gpu')!.product.specs.score as number;
    expect(gpuScore(gaming)).toBeGreaterThan(gpuScore(office));
  });

  it('edición de video prioriza más RAM que ofimática', () => {
    const ram = (b: ReturnType<typeof recommendBuilds>['builds'][number]) =>
      b.components.find((c) => c.category === 'ram')!.product.specs.capacityGB as number;
    const video = recommendBuilds(input({ budget: 2200, use: 'video' }), 50_000).builds[0]!;
    const office = recommendBuilds(input({ budget: 2200, use: 'office' }), 50_000).builds[0]!;
    expect(ram(video)).toBeGreaterThanOrEqual(ram(office));
  });

  it('respeta las preferencias de marca', () => {
    const r = recommendBuilds(
      input({ budget: 1500, preferences: { ...any, cpuBrand: 'intel', gpuBrand: 'nvidia' } }),
      50_000,
    );
    expect(r.builds.length).toBeGreaterThan(0);
    for (const b of r.builds) {
      expect(b.components.find((c) => c.category === 'cpu')!.product.brand).toBe('Intel');
      expect(b.components.find((c) => c.category === 'gpu')!.product.brand).toBe('NVIDIA');
    }
  });

  it('con "compacto" solo usa placas mATX/ITX', () => {
    const r = recommendBuilds(
      input({ budget: 1500, preferences: { ...any, size: 'compact' } }),
      50_000,
    );
    expect(r.builds.length).toBeGreaterThan(0);
    for (const b of r.builds) {
      expect(['mATX', 'ITX']).toContain(
        b.components.find((c) => c.category === 'motherboard')!.product.specs.formFactor,
      );
    }
  });

  it('informa cuando el presupuesto no alcanza', () => {
    const r = recommendBuilds(input({ budget: 400 }), 50_000);
    expect(r.builds).toHaveLength(0);
    expect(r.message).toMatch(/no alcanza/);
  });

  it('respeta el límite de combinaciones evaluadas', () => {
    const r = recommendBuilds(input({ budget: 5000 }), 500);
    expect(r.stats.evaluated).toBeLessThanOrEqual(501);
    expect(r.stats.truncated).toBe(true);
  });
});
