import { Router } from 'express';
import {
  completeTurnHandler,
  getTurnDetail,
  listTurns,
  startTurnHandler,
} from './turn.controller';

export const turnRouter = Router();

turnRouter.get('/', listTurns);
turnRouter.get('/:id', getTurnDetail);
turnRouter.patch('/:id/start', startTurnHandler);
turnRouter.patch('/:id/complete', completeTurnHandler);
