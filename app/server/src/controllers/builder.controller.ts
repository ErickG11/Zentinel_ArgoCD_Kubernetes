import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Config } from '../config';
import { checkBuild } from '../services/compat';
import { recommendBuilds } from '../services/recommend';

const id = z.string().min(1).max(80);

export const selectionSchema = z
  .object({
    cpu: id.optional(),
    motherboard: id.optional(),
    ram: id.optional(),
    gpu: id.optional(),
    psu: id.optional(),
    case: id.optional(),
    cooling: id.optional(),
    storage: z.array(id).max(3).optional(),
  })
  .strict();

export const recommendSchema = z.object({
  budget: z.number().min(400).max(20000),
  use: z.enum(['gaming', 'video', 'programming', 'office', 'streaming']),
  preferences: z
    .object({
      cpuBrand: z.enum(['any', 'amd', 'intel']).default('any'),
      gpuBrand: z.enum(['any', 'nvidia', 'amd']).default('any'),
      size: z.enum(['any', 'compact']).default('any'),
      noise: z.enum(['any', 'quiet']).default('any'),
      upgradeability: z.enum(['any', 'high']).default('any'),
    })
    .default({}),
  count: z.number().int().min(1).max(5).default(3),
});

export const check = (req: Request, res: Response) => {
  res.json(checkBuild(req.body as z.infer<typeof selectionSchema>));
};

export const recommend = (config: Config) => (req: Request, res: Response) => {
  res.json(
    recommendBuilds(req.body as z.infer<typeof recommendSchema>, config.recommendMaxCombinations),
  );
};
