"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const health_routes_1 = require("./health.routes");
const department_routes_1 = require("../modules/department/department.routes");
const room_routes_1 = require("../modules/room/room.routes");
const service_routes_1 = require("../modules/service/service.routes");
const doctor_routes_1 = require("../modules/doctor/doctor.routes");
const patient_routes_1 = require("../modules/patient/patient.routes");
const visit_routes_1 = require("../modules/visit/visit.routes");
const queue_routes_1 = require("../modules/queue/queue.routes");
const dashboard_routes_1 = require("../modules/dashboard/dashboard.routes");
const turn_routes_1 = require("../modules/turn/turn.routes");
const appointment_routes_1 = require("../modules/appointment/appointment.routes");
const cls_routes_1 = require("../modules/cls/cls.routes");
const dispatch_routes_1 = require("../modules/dispatch/dispatch.routes");
const auth_routes_1 = require("../modules/auth/auth.routes");
const invoice_routes_1 = require("../modules/invoice/invoice.routes");
exports.apiRouter = (0, express_1.Router)();
exports.apiRouter.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'patient-dispatch-backend',
    });
});
exports.apiRouter.use(health_routes_1.healthRouter);
exports.apiRouter.use('/auth', auth_routes_1.authRouter);
exports.apiRouter.use('/departments', department_routes_1.departmentRouter);
exports.apiRouter.use('/rooms', room_routes_1.roomRouter);
exports.apiRouter.use('/services', service_routes_1.serviceRouter);
exports.apiRouter.use('/doctors', doctor_routes_1.doctorRouter);
exports.apiRouter.use('/patients', patient_routes_1.patientRouter);
exports.apiRouter.use('/visits', visit_routes_1.visitRouter);
exports.apiRouter.use('/queue', queue_routes_1.queueRouter);
exports.apiRouter.use('/turns', turn_routes_1.turnRouter);
exports.apiRouter.use('/appointments', appointment_routes_1.appointmentRouter);
exports.apiRouter.use('/cls', cls_routes_1.clsRouter);
exports.apiRouter.use('/dispatch', dispatch_routes_1.dispatchRouter);
exports.apiRouter.use('/dashboard', dashboard_routes_1.dashboardRouter);
exports.apiRouter.use('/invoices', invoice_routes_1.invoiceRouter);
