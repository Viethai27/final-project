import { Router } from 'express';
import {
  completeClsOrderHandler,
  createClsOrderHandler,
  getClsOrderDetail,
  getClsResultDetail,
  listClsOrders,
  listClsResults,
  startClsOrderHandler,
} from './cls.controller';

export const clsRouter = Router();

clsRouter.post('/orders', createClsOrderHandler);
clsRouter.get('/orders', listClsOrders);
clsRouter.get('/orders/:id', getClsOrderDetail);
clsRouter.patch('/orders/:id/start', startClsOrderHandler);
clsRouter.patch('/orders/:id/complete', completeClsOrderHandler);
clsRouter.get('/results', listClsResults);
clsRouter.get('/results/:id', getClsResultDetail);
