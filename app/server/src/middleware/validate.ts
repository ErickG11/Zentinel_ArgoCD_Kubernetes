import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

/** Valida y reemplaza req.body / req.query con el resultado tipado de zod. */
export const validateBody =
  <T extends ZodTypeAny>(schema: T): RequestHandler =>
  (req, _res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) return next(r.error);
    req.body = r.data as z.infer<T>;
    next();
  };

export const parseQuery = <T extends ZodTypeAny>(schema: T, query: unknown): z.infer<T> =>
  schema.parse(query);
