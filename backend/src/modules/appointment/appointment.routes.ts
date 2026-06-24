import { Router } from 'express';
import {
  approveAppointmentHandler,
  checkInAppointmentHandler,
  createAppointmentHandler,
  getAvailableAppointmentSlotsHandler,
  listAppointmentsHandler,
  rejectAppointmentHandler,
} from './appointment.controller';

export const appointmentRouter = Router();

appointmentRouter.get('/', listAppointmentsHandler);
appointmentRouter.get('/available-slots', getAvailableAppointmentSlotsHandler);
appointmentRouter.post('/', createAppointmentHandler);
appointmentRouter.patch('/:id/approve', approveAppointmentHandler);
appointmentRouter.patch('/:id/reject', rejectAppointmentHandler);
appointmentRouter.patch('/:id/check-in', checkInAppointmentHandler);
