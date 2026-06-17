import { Router } from 'express';
import { loginHandler, logoutHandler, meHandler } from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', loginHandler);
authRouter.get('/me', meHandler);
authRouter.post('/logout', logoutHandler);
