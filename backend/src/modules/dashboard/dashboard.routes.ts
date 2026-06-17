import { Router } from 'express';
import { getOverview } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/overview', getOverview);
