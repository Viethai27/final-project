import { Router } from 'express';
import { createPatient, listPatients } from './patient.controller';

export const patientRouter = Router();

patientRouter.get('/', listPatients);
patientRouter.post('/', createPatient);
