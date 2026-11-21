import { describe, expect, it } from 'vitest';
import { checkBuild, powerReport, resolveSelection } from '../src/services/compat';
import { GOOD_BUILD } from './helpers';

const codes = (r: ReturnType<typeof checkBuild>) => r.issues.map((i) => i.code);

describe('motor de compatibilidad', () => {
  it('acepta una build completa y compatible', () => {
    const r = checkBuild(GOOD_BUILD);
    expect(r.compatible).toBe(true);
    expect(r.complete).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('detecta socket incompatible CPU ↔ placa', () => {
    const r = checkBuild({ cpu: 'intel-core-i5-13600k', motherboard: 'asus-tuf-b650-plus-wifi' });
    expect(r.compatible).toBe(false);
    expect(codes(r)).toContain('SOCKET_MISMATCH');
  });

  it('detecta tipo de RAM incompatible con la placa', () => {
    const r = checkBuild({ ram: 'kingston-fury-beast-16-d4', motherboard: 'gigabyte-b650m-ds3h' });
    expect(codes(r)).toContain('RAM_TYPE_MISMATCH');
  });

  it('detecta formato de placa no soportado por el case', () => {
    const r = checkBuild({ motherboard: 'msi-b550-gaming-plus', case: 'coolermaster-nr200p' });
    expect(codes(r)).toContain('FORM_FACTOR_MISMATCH');
  });

  it('detecta GPU demasiado larga para el case', () => {
    const r = checkBuild({ gpu: 'nvidia-rtx-4080-super', case: 'coolermaster-nr200p' });
    expect(codes(r)).toContain('GPU_TOO_LONG');
  });

  it('avisa cuando la GPU entra muy justa', () => {
    const r = checkBuild({ gpu: 'nvidia-rtx-4070-super', case: 'thermaltake-s100-tg' });
    expect(codes(r)).toContain('GPU_TIGHT_FIT');
    expect(r.compatible).toBe(true);
  });

  it('detecta fuente insuficiente', () => {
    const r = checkBuild({
      cpu: 'intel-core-i7-14700k',
      gpu: 'nvidia-rtx-4080-super',
      psu: 'coolermaster-mwe-550-bronze',
    });
    expect(r.power.level).toBe('insufficient');
    expect(codes(r)).toContain('PSU_INSUFFICIENT');
    expect(r.compatible).toBe(false);
  });

  it('clasifica la holgura de la fuente (justa y amplia)', () => {
    const tight = powerReport(
      resolveSelection({
        cpu: 'intel-core-i7-14700k',
        gpu: 'nvidia-rtx-4080-super',
        psu: 'corsair-cv650',
      }),
    );
    expect(tight.level).toBe('tight');
    const ample = powerReport(
      resolveSelection({ cpu: 'amd-ryzen-5-5600', gpu: 'amd-rx-7600', psu: 'corsair-rm1000x' }),
    );
    expect(ample.level).toBe('ample');
  });

  it('advierte cuello de botella CPU/GPU', () => {
    const r = checkBuild({ cpu: 'amd-ryzen-5-5600', gpu: 'nvidia-rtx-4080-super' });
    expect(codes(r)).toContain('CPU_BOTTLENECK');
    const r2 = checkBuild({ cpu: 'amd-ryzen-9-7950x', gpu: 'amd-rx-7600' });
    expect(codes(r2)).toContain('GPU_BOTTLENECK');
  });

  it('valida cooler: altura, socket y capacidad térmica', () => {
    expect(codes(checkBuild({ cooling: 'noctua-nh-d15', case: 'thermaltake-s100-tg' }))).toContain(
      'COOLER_TOO_TALL',
    );
    expect(
      codes(checkBuild({ cooling: 'coolermaster-hyper-212', cpu: 'amd-ryzen-9-7950x' })),
    ).toContain('COOLER_UNDERPOWERED');
  });

  it('limita unidades NVMe a las ranuras M.2 de la placa', () => {
    const r = checkBuild({
      motherboard: 'asrock-b450m-hdv',
      storage: ['wd-blue-sn580-1tb', 'kingston-nv2-500'],
    });
    expect(codes(r)).toContain('M2_SLOTS_EXCEEDED');
  });

  it('calcula precio total y desglose', () => {
    const r = checkBuild(GOOD_BUILD);
    const sum = r.price.breakdown.reduce((s, b) => s + b.price, 0);
    expect(r.price.total).toBeCloseTo(sum, 2);
    expect(r.price.breakdown).toHaveLength(8);
  });

  it('informa las piezas que faltan', () => {
    const r = checkBuild({ cpu: 'amd-ryzen-5-7600' });
    expect(r.complete).toBe(false);
    expect(r.missing).toContain('gpu');
  });

  it('rechaza ids inexistentes o de categoría equivocada', () => {
    expect(() => checkBuild({ cpu: 'no-existe' })).toThrow(/no existe/);
    expect(() => checkBuild({ cpu: 'nvidia-rtx-4060' })).toThrow(/no es un componente/);
  });
});
