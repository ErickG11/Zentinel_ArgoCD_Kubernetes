import { Router } from 'express';
import type { Config } from '../config';
import * as builder from '../controllers/builder.controller';
import * as catalog from '../controllers/catalog.controller';
import * as orders from '../controllers/orders.controller';
import * as system from '../controllers/system.controller';
import { validateBody } from '../middleware/validate';
import { orderInputSchema } from '../services/orders';

/** Rutas de la API (montadas bajo /api). */
export function apiRouter(config: Config): Router {
  const r = Router();

  r.get('/products', catalog.getProducts);
  r.get('/products/suggest', catalog.getSuggestions);
  r.get('/products/:id', catalog.getProductById);
  r.get('/products/:id/related', catalog.getRelated);
  r.get('/categories', catalog.getCategories);
  r.get('/compare', catalog.getCompare);

  r.post('/builder/check', validateBody(builder.selectionSchema), builder.check);
  r.post('/builder/recommend', validateBody(builder.recommendSchema), builder.recommend(config));

  r.get('/orders/options', orders.options);
  r.post('/orders', validateBody(orderInputSchema), orders.create(config));
  r.get('/orders/verify/:token', orders.verify(config));

  r.get('/system/info', system.info(config));
  return r;
}
