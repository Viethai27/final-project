import { Router } from 'express';
import { getQueueDetail, listQueue } from './queue.controller';

export const queueRouter = Router();

queueRouter.get('/', listQueue);
queueRouter.get('/:id', getQueueDetail);
