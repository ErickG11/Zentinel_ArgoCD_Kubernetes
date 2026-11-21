import type { Product } from '../api/types';

export const gpu: Product = {
  id: 'nvidia-rtx-4060',
  sku: 'ZS-GPU-0001',
  name: 'NVIDIA GeForce RTX 4060 8GB',
  brand: 'NVIDIA',
  category: 'gpu',
  price: 299,
  stock: 15,
  rating: 4.4,
  description: 'Gaming 1080p fluido con DLSS 3.',
  specs: { tdp: 115, lengthMm: 240, score: 45, vramGB: 8, chip: 'AD107' },
  tags: ['gpu'],
};

export const ram: Product = {
  ...gpu,
  id: 'kingston-fury-beast-16-d4',
  name: 'Kingston FURY Beast 16GB DDR4-3200',
  brand: 'Kingston',
  category: 'ram',
  price: 42,
  stock: 3,
  specs: { ramType: 'DDR4', capacityGB: 16 },
};
