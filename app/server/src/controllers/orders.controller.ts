import type { Request, Response } from 'express';
import type { Config } from '../config';
import { notFound } from '../lib/errors';
import {
  CITIES,
  IVA_RATE,
  PAYMENT_METHODS,
  SHIPPING_BY_CITY,
  createOrder,
  verifyOrder,
  type OrderInput,
} from '../services/orders';

export const create = (config: Config) => (req: Request, res: Response) => {
  const receipt = createOrder(req.body as OrderInput, config.orderSigningKey);
  req.log.info({ orderCode: receipt.code, total: receipt.order.totals.total }, 'pedido creado');
  res.status(201).json(receipt);
};

export const verify = (config: Config) => (req: Request, res: Response) => {
  const result = verifyOrder(String(req.params.token), config.orderSigningKey);
  if (!result.valid) {
    res.status(result.reason === 'SIGNATURE' ? 422 : 400).json({
      valid: false,
      reason: result.reason,
      message:
        result.reason === 'SIGNATURE'
          ? 'La firma no coincide: el comprobante fue alterado o pertenece a otra instalación.'
          : 'El token no tiene un formato de comprobante válido.',
    });
    return;
  }
  if (!result.data?.code) throw notFound('Pedido');
  res.json({ valid: true, order: result.data });
};

export const options = (_req: Request, res: Response) => {
  res.json({
    cities: CITIES.map((name) => ({ name, shipping: SHIPPING_BY_CITY[name] })),
    paymentMethods: PAYMENT_METHODS,
    ivaRate: IVA_RATE,
  });
};
