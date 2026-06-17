import { Router } from 'express';
import { listDoctors } from './doctor.controller';

export const doctorRouter = Router();

doctorRouter.get('/', listDoctors);
