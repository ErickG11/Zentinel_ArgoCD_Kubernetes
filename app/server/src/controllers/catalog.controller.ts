import type { Request, Response } from 'express';
import { z } from 'zod';
import { CATEGORY_SLUGS } from '../data/types';
import { parseQuery } from '../middleware/validate';
import {
  getProductOrThrow,
  listCategories,
  listProducts,
  relatedProducts,
} from '../services/catalog.service';
import { compareProducts } from '../services/compare.service';
import { suggest } from '../services/search';

const boolish = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const productsQuery = z
  .object({
    q: z.string().trim().max(80).optional(),
    category: z.enum(CATEGORY_SLUGS).optional(),
    brand: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v
              .split(',')
              .map((b) => b.trim())
              .filter(Boolean)
          : undefined,
      ),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    inStock: boolish.optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'name']).default('relevance'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: 'minPrice no puede ser mayor que maxPrice',
    path: ['minPrice'],
  });

export const getProducts = (req: Request, res: Response) => {
  const q = parseQuery(productsQuery, req.query);
  res.json(listProducts(q));
};

export const getSuggestions = (req: Request, res: Response) => {
  const { q } = parseQuery(z.object({ q: z.string().trim().min(1).max(80) }), req.query);
  res.json({ suggestions: suggest(q) });
};

export const getProductById = (req: Request, res: Response) => {
  res.json(getProductOrThrow(String(req.params.id)));
};

export const getRelated = (req: Request, res: Response) => {
  res.json({ items: relatedProducts(String(req.params.id)) });
};

export const getCategories = (_req: Request, res: Response) => {
  res.json({ items: listCategories() });
};

export const getCompare = (req: Request, res: Response) => {
  const { ids } = parseQuery(
    z.object({
      ids: z
        .string()
        .min(1)
        .transform((v) =>
          v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
    }),
    req.query,
  );
  res.json(compareProducts(ids));
};
