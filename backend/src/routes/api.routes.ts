import { Router } from 'express';
import { healthRouter } from './health.routes';
import { departmentRouter } from '../modules/department/department.routes';
import { roomRouter } from '../modules/room/room.routes';
import { serviceRouter } from '../modules/service/service.routes';
import { doctorRouter } from '../modules/doctor/doctor.routes';
import { patientRouter } from '../modules/patient/patient.routes';
import { visitRouter } from '../modules/visit/visit.routes';
import { queueRouter } from '../modules/queue/queue.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { turnRouter } from '../modules/turn/turn.routes';
import { appointmentRouter } from '../modules/appointment/appointment.routes';
import { clsRouter } from '../modules/cls/cls.routes';
import { dispatchRouter } from '../modules/dispatch/dispatch.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { invoiceRouter } from '../modules/invoice/invoice.routes';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'patient-dispatch-backend',
  });
});

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/departments', departmentRouter);
apiRouter.use('/rooms', roomRouter);
apiRouter.use('/services', serviceRouter);
apiRouter.use('/doctors', doctorRouter);
apiRouter.use('/patients', patientRouter);
apiRouter.use('/visits', visitRouter);
apiRouter.use('/queue', queueRouter);
apiRouter.use('/turns', turnRouter);
apiRouter.use('/appointments', appointmentRouter);
apiRouter.use('/cls', clsRouter);
apiRouter.use('/dispatch', dispatchRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/invoices', invoiceRouter);
