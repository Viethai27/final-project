import { Router } from 'express';
import { listServices } from './service.controller';

export const serviceRouter = Router();

serviceRouter.get('/', listServices);
