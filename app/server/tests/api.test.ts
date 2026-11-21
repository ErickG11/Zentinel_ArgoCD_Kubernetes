import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { CUSTOMER, GOOD_BUILD, testApp } from './helpers';

const { app } = testApp();

describe('operacionales', () => {
  it('GET /healthz y /readyz responden 200', async () => {
    expect((await request(app).get('/healthz')).body).toEqual({ status: 'ok' });
    expect((await request(app).get('/readyz')).body).toEqual({ status: 'ready' });
  });

  it('GET /api/system/info expone pod, versión, entorno y namespace', async () => {
    const r = await request(app).get('/api/system/info');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ version: '9.9.9', environment: 'test', namespace: 'testns' });
    expect(typeof r.body.pod).toBe('string');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.headers.connection).toBe('close');
    expect(r.body.requestsServed).toBeGreaterThan(0);
  });

  it('GET /metrics expone métricas Prometheus', async () => {
    const r = await request(app).get('/metrics');
    expect(r.status).toBe(200);
    expect(r.text).toContain('http_request_duration_seconds');
  });

  it('incluye cabeceras de seguridad (helmet) y X-Request-Id', async () => {
    const r = await request(app).get('/healthz').set('X-Request-Id', 'abc-123');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-request-id']).toBe('abc-123');
  });
});

describe('catálogo', () => {
  it('lista productos con paginación y facetas', async () => {
    const r = await request(app).get('/api/products?pageSize=5');
    expect(r.status).toBe(200);
    expect(r.body.items).toHaveLength(5);
    expect(r.body.total).toBeGreaterThanOrEqual(80);
    expect(r.body.facets.brands.length).toBeGreaterThan(5);
  });

  it('busca con errores de tipeo vía API', async () => {
    const r = await request(app).get('/api/products?q=procesdor ryzem');
    expect(r.body.items.length).toBeGreaterThan(0);
    expect(r.body.items[0].category).toBe('cpu');
  });

  it('valida parámetros inválidos con 400 consistente', async () => {
    const r = await request(app).get('/api/products?page=0&sort=raro');
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
    expect(r.body.error.requestId).toBeTruthy();
  });

  it('detalle, relacionados y 404', async () => {
    expect((await request(app).get('/api/products/noctua-nh-d15')).body.name).toContain('Noctua');
    const rel = await request(app).get('/api/products/noctua-nh-d15/related');
    expect(rel.body.items.every((p: { category: string }) => p.category === 'cooling')).toBe(true);
    const nf = await request(app).get('/api/products/nada');
    expect(nf.status).toBe(404);
    expect(nf.body.error.code).toBe('NOT_FOUND');
  });

  it('categorías y comparador', async () => {
    expect((await request(app).get('/api/categories')).body.items).toHaveLength(14);
    const c = await request(app).get('/api/compare?ids=nvidia-rtx-4060,amd-rx-7600');
    expect(c.status).toBe(200);
    expect(c.body.rows.length).toBeGreaterThan(5);
    expect(
      (await request(app).get('/api/compare?ids=nvidia-rtx-4060,amd-ryzen-5-7600')).status,
    ).toBe(422);
  });
});

describe('armador y asistente', () => {
  it('POST /api/builder/check valida una build', async () => {
    const r = await request(app).post('/api/builder/check').send(GOOD_BUILD);
    expect(r.status).toBe(200);
    expect(r.body.compatible).toBe(true);
    const bad = await request(app)
      .post('/api/builder/check')
      .send({ cpu: 'intel-core-i5-13600k', motherboard: 'gigabyte-b650m-ds3h' });
    expect(bad.body.compatible).toBe(false);
  });

  it('rechaza campos desconocidos en el body', async () => {
    const r = await request(app).post('/api/builder/check').send({ cpu: 'x', hack: 1 });
    expect(r.status).toBe(400);
  });

  it('POST /api/builder/recommend devuelve builds', async () => {
    const r = await request(app)
      .post('/api/builder/recommend')
      .send({ budget: 1300, use: 'gaming' });
    expect(r.status).toBe(200);
    expect(r.body.builds.length).toBeGreaterThan(0);
    expect(r.body.stats.evaluated).toBeGreaterThan(0);
    expect(
      (await request(app).post('/api/builder/recommend').send({ budget: 10, use: 'gaming' }))
        .status,
    ).toBe(400);
  });
});

describe('pedidos', () => {
  const body = {
    customer: CUSTOMER,
    items: [{ productId: 'logitech-g203', qty: 2 }],
    paymentMethod: 'card_sim',
  };

  it('crea un pedido y verifica el comprobante (flujo completo)', async () => {
    const created = await request(app).post('/api/orders').send(body);
    expect(created.status).toBe(201);
    expect(created.body.code).toMatch(/^ZS-/);
    const v = await request(app).get(`/api/orders/verify/${created.body.token}`);
    expect(v.status).toBe(200);
    expect(v.body.valid).toBe(true);
    expect(v.body.order.code).toBe(created.body.code);
  });

  it('un comprobante firmado se valida en OTRA instancia con la misma clave (stateless)', async () => {
    const created = await request(app).post('/api/orders').send(body);
    const { app: replica } = testApp(); // otra "réplica" con la misma clave
    const v = await request(replica).get(`/api/orders/verify/${created.body.token}`);
    expect(v.body.valid).toBe(true);
  });

  it('falla en otra instancia con clave distinta', async () => {
    const created = await request(app).post('/api/orders').send(body);
    const { app: other } = testApp({ ORDER_SIGNING_KEY: 'clave-distinta-0123456789abcdef' });
    const v = await request(other).get(`/api/orders/verify/${created.body.token}`);
    expect(v.status).toBe(422);
    expect(v.body.valid).toBe(false);
  });

  it('valida datos del cliente', async () => {
    const r = await request(app)
      .post('/api/orders')
      .send({ ...body, customer: { ...CUSTOMER, email: 'no-es-correo', phone: '123' } });
    expect(r.status).toBe(400);
    expect(r.body.error.details.length).toBeGreaterThanOrEqual(2);
  });
});

describe('configuración y límites', () => {
  it('rate limit configurable por env', async () => {
    const { app: limited } = testApp({ RATE_LIMIT_ENABLED: 'true', RATE_LIMIT_MAX: '3' });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++)
      statuses.push((await request(limited).get('/api/categories')).status);
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
    // Las sondas no se limitan
    expect((await request(limited).get('/healthz')).status).toBe(200);
  });

  it('config inválida lanza error claro; sin ORDER_SIGNING_KEY genera clave efímera', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Configuración inválida/);
    const c = loadConfig({});
    expect(c.orderKeyEphemeral).toBe(true);
    expect(c.orderSigningKey.length).toBeGreaterThanOrEqual(32);
  });

  it('JSON mal formado devuelve 400 y rutas desconocidas 404', async () => {
    const bad = await request(app)
      .post('/api/builder/check')
      .set('Content-Type', 'application/json')
      .send('{oops');
    expect(bad.status).toBe(400);
    expect((await request(app).get('/api/nada')).status).toBe(404);
  });
});
