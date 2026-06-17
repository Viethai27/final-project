import { Router } from 'express';
import {
  approveAppointmentHandler,
  checkInAppointmentHandler,
  createAppointmentHandler,
  listAppointmentsHandler,
  rejectAppointmentHandler,
} from './appointment.controller';

export const appointmentRouter = Router();

appointmentRouter.get('/', listAppointmentsHandler);
appointmentRouter.post('/', createAppointmentHandler);
appointmentRouter.patch('/:id/approve', approveAppointmentHandler);
appointmentRouter.patch('/:id/reject', rejectAppointmentHandler);
appointmentRouter.patch('/:id/check-in', checkInAppointmentHandler);
