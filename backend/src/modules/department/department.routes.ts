import { Router } from 'express';
import { listDepartments } from './department.controller';

export const departmentRouter = Router();

departmentRouter.get('/', listDepartments);
