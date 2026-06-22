import { Router } from 'express';
import {
  callQueueItemHandler,
  cancelQueueItemHandler,
  getQueueDetail,
  listQueue,
  startQueueItemHandler,
  timeoutQueueItemHandler,
} from './queue.controller';

export const queueRouter = Router();

queueRouter.get('/', listQueue);
queueRouter.patch('/:id/call', callQueueItemHandler);
queueRouter.patch('/:id/start', startQueueItemHandler);
queueRouter.patch('/:id/timeout', timeoutQueueItemHandler);
queueRouter.patch('/:id/cancel', cancelQueueItemHandler);
queueRouter.get('/:id', getQueueDetail);
