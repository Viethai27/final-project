import { Router } from 'express';
import { concludeVisitHandler, createWalkInVisitHandler, getVisitDetail, listVisits } from './visit.controller';
import { getVisitClsOrders } from '../cls/cls.controller';
import { getVisitTurns } from '../turn/turn.controller';

export const visitRouter = Router();

visitRouter.get('/', listVisits);
visitRouter.post('/walk-in', createWalkInVisitHandler);
visitRouter.get('/:visitId/turns', getVisitTurns);
visitRouter.get('/:visitId/cls-orders', getVisitClsOrders);
visitRouter.patch('/:id/conclusion', concludeVisitHandler);
visitRouter.get('/:id', getVisitDetail);
