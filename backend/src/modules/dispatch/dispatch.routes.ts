import { Router } from 'express';
import {
  createDispatchDecisionHandler,
  getDispatchDecisionDetail,
  getDispatchSuggestionDetail,
  listDispatchDecisions,
  listDispatchSuggestions,
} from './dispatch.controller';

export const dispatchRouter = Router();

dispatchRouter.get('/suggestions', listDispatchSuggestions);
dispatchRouter.get('/suggestions/:visitId', getDispatchSuggestionDetail);
dispatchRouter.post('/decisions', createDispatchDecisionHandler);
dispatchRouter.get('/decisions', listDispatchDecisions);
dispatchRouter.get('/decisions/:id', getDispatchDecisionDetail);
