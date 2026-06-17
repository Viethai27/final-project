"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const money = (value) => new client_1.Prisma.Decimal(value.toFixed(2));
const d = (value) => new Date(`${value}T00:00:00.000Z`);
const dt = (value) => new Date(`${value}Z`);
async function main() {
    await prisma.$transaction(async (tx) => {
        await tx.invoiceItem.deleteMany();
        await tx.invoice.deleteMany();
        await tx.dispatchOutcome.deleteMany();
        await tx.dispatchRecommendation.deleteMany();
        await tx.dispatchDecision.deleteMany();
        await tx.escalationLog.deleteMany();
        await tx.queueSnapshot.deleteMany();
        await tx.resourceLoad.deleteMany();
        await tx.cLSResult.deleteMany();
        await tx.cLSOrder.deleteMany();
        await tx.turnProgress.deleteMany();
        await tx.turn.deleteMany();
        await tx.queueItemHistory.deleteMany();
        await tx.queueItemStatus.deleteMany();
        await tx.queueItem.deleteMany();
        await tx.visitAssignment.deleteMany();
        await tx.visitClinical.deleteMany();
        await tx.visitStateHistory.deleteMany();
        await tx.visitProgress.deleteMany();
        await tx.visit.deleteMany();
        await tx.appointment.deleteMany();
        await tx.workSchedule.deleteMany();
        await tx.serviceRoom.deleteMany();
        await tx.doctorProfile.deleteMany();
        await tx.patient.deleteMany();
        await tx.room.deleteMany();
        await tx.serviceCatalog.deleteMany();
        await tx.user.deleteMany();
        await tx.department.deleteMany();
        await tx.department.createMany({
            data: [
                { id: 'dept_ntq', name: 'Nội Tổng Quát', code: 'NTQ', description: 'Khoa khám nội tổng quát' },
                { id: 'dept_tm', name: 'Tim Mạch', code: 'TM', description: 'Khoa tim mạch' },
                { id: 'dept_nhi', name: 'Nhi Khoa', code: 'NK', description: 'Khoa nhi' },
                { id: 'dept_spk', name: 'Sản Phụ Khoa', code: 'SPK', description: 'Khoa sản phụ khoa' },
                { id: 'dept_cls', name: 'Cận Lâm Sàng', code: 'CLS', description: 'Khối cận lâm sàng' },
            ],
        });
        const passwords = await Promise.all([
            bcryptjs_1.default.hash('admin123', 10),
            bcryptjs_1.default.hash('letan123', 10),
            bcryptjs_1.default.hash('dp123', 10),
            bcryptjs_1.default.hash('bs123', 10),
            bcryptjs_1.default.hash('bs123', 10),
            bcryptjs_1.default.hash('ktv123', 10),
            bcryptjs_1.default.hash('ql123', 10),
        ]);
        await tx.user.createMany({
            data: [
                { id: 'user_admin', username: 'admin', passwordHash: passwords[0], fullName: 'Nguyễn Văn Quản Trị', email: 'admin@hospital.test', role: 'ADMIN', departmentId: 'dept_ntq' },
                { id: 'user_letan', username: 'letan', passwordHash: passwords[1], fullName: 'Trần Thị Lễ Tân', email: 'letan@hospital.test', role: 'RECEPTIONIST', departmentId: 'dept_ntq' },
                { id: 'user_dieuphoi', username: 'dieuphoi', passwordHash: passwords[2], fullName: 'Lê Văn Điều Phối', email: 'dieuphoi@hospital.test', role: 'COORDINATOR', departmentId: 'dept_ntq' },
                { id: 'user_bsnam', username: 'bsnam', passwordHash: passwords[3], fullName: 'BS. Phạm Hoài Nam', email: 'bsnam@hospital.test', role: 'DOCTOR', departmentId: 'dept_ntq' },
                { id: 'user_bshuong', username: 'bshuong', passwordHash: passwords[4], fullName: 'BS. Nguyễn Thu Hương', email: 'bshuong@hospital.test', role: 'DOCTOR', departmentId: 'dept_tm' },
                { id: 'user_ktvxn', username: 'ktvxn', passwordHash: passwords[5], fullName: 'Kỹ thuật viên XN', email: 'ktvxn@hospital.test', role: 'LAB_STAFF', departmentId: 'dept_cls' },
                { id: 'user_quanly', username: 'quanly', passwordHash: passwords[6], fullName: 'Nguyễn Thị Quản Lý', email: 'quanly@hospital.test', role: 'MANAGER', departmentId: 'dept_ntq' },
            ],
        });
        await tx.room.createMany({
            data: [
                { id: 'room_101', departmentId: 'dept_ntq', name: 'Phòng Khám 101', code: 'RM101', roomType: 'EXAM', capacity: 15, avgServiceTime: 15, isActive: true },
                { id: 'room_102', departmentId: 'dept_tm', name: 'Phòng Khám 102', code: 'RM102', roomType: 'EXAM', capacity: 12, avgServiceTime: 20, isActive: true },
                { id: 'room_103', departmentId: 'dept_nhi', name: 'Phòng Khám 103', code: 'RM103', roomType: 'EXAM', capacity: 12, avgServiceTime: 12, isActive: true },
                { id: 'room_lab', departmentId: 'dept_cls', name: 'Phòng Xét Nghiệm', code: 'LAB001', roomType: 'LAB', capacity: 20, avgServiceTime: 8, isActive: true },
                { id: 'room_us', departmentId: 'dept_cls', name: 'Phòng Siêu Âm', code: 'IMG001', roomType: 'IMAGING', capacity: 8, avgServiceTime: 20, isActive: true },
                { id: 'room_xray', departmentId: 'dept_cls', name: 'Phòng X-Quang', code: 'IMG002', roomType: 'IMAGING', capacity: 10, avgServiceTime: 10, isActive: true },
            ],
        });
        await tx.serviceCatalog.createMany({
            data: [
                { id: 'svc_ntq', name: 'Khám Nội Tổng Quát', code: 'KB001', serviceType: 'EXAM', roomTypeRequired: 'EXAM', isUrgentCls: false, targetWaitTime: 15, avgDuration: 15, price: money(150000), isActive: true },
                { id: 'svc_tm', name: 'Khám Tim Mạch', code: 'KB002', serviceType: 'EXAM', roomTypeRequired: 'EXAM', isUrgentCls: false, targetWaitTime: 20, avgDuration: 20, price: money(200000), isActive: true },
                { id: 'svc_nhi', name: 'Khám Nhi', code: 'KB003', serviceType: 'EXAM', roomTypeRequired: 'EXAM', isUrgentCls: false, targetWaitTime: 12, avgDuration: 12, price: money(150000), isActive: true },
                { id: 'svc_spk', name: 'Khám Sản Phụ Khoa', code: 'KB004', serviceType: 'EXAM', roomTypeRequired: 'EXAM', isUrgentCls: false, targetWaitTime: 20, avgDuration: 20, price: money(200000), isActive: true },
                { id: 'svc_blood', name: 'Xét Nghiệm Máu', code: 'XN001', serviceType: 'LAB', roomTypeRequired: 'LAB', isUrgentCls: false, targetWaitTime: 8, avgDuration: 8, price: money(180000), isActive: true },
                { id: 'svc_us', name: 'Siêu Âm', code: 'SA001', serviceType: 'IMAGING', roomTypeRequired: 'IMAGING', isUrgentCls: false, targetWaitTime: 20, avgDuration: 20, price: money(300000), isActive: true },
                { id: 'svc_xray', name: 'X-quang', code: 'XQ001', serviceType: 'IMAGING', roomTypeRequired: 'IMAGING', isUrgentCls: false, targetWaitTime: 10, avgDuration: 10, price: money(150000), isActive: true },
                { id: 'svc_ecg', name: 'Điện tim', code: 'DT001', serviceType: 'LAB', roomTypeRequired: 'LAB', isUrgentCls: false, targetWaitTime: 15, avgDuration: 15, price: money(120000), isActive: true },
            ],
        });
        await tx.doctorProfile.createMany({
            data: [
                { id: 'doctor_bsnam', userId: 'user_bsnam', name: 'BS. Phạm Hoài Nam', specialty: 'Nội Tổng Quát', departmentId: 'dept_ntq', defaultRoomId: 'room_101', licenseNumber: 'LIC-NTQ-001', isActive: true },
                { id: 'doctor_bshuong', userId: 'user_bshuong', name: 'BS. Nguyễn Thu Hương', specialty: 'Tim Mạch', departmentId: 'dept_tm', defaultRoomId: 'room_102', licenseNumber: 'LIC-TM-001', isActive: true },
            ],
        });
        await tx.serviceRoom.createMany({
            data: [
                { id: 'srvroom_1', serviceId: 'svc_ntq', roomId: 'room_101', isActive: true },
                { id: 'srvroom_2', serviceId: 'svc_ntq', roomId: 'room_102', isActive: true },
                { id: 'srvroom_3', serviceId: 'svc_tm', roomId: 'room_102', isActive: true },
                { id: 'srvroom_4', serviceId: 'svc_nhi', roomId: 'room_103', isActive: true },
                { id: 'srvroom_5', serviceId: 'svc_spk', roomId: 'room_101', isActive: true },
                { id: 'srvroom_6', serviceId: 'svc_blood', roomId: 'room_lab', isActive: true },
                { id: 'srvroom_7', serviceId: 'svc_us', roomId: 'room_us', isActive: true },
                { id: 'srvroom_8', serviceId: 'svc_xray', roomId: 'room_xray', isActive: true },
                { id: 'srvroom_9', serviceId: 'svc_ecg', roomId: 'room_lab', isActive: true },
            ],
        });
        await tx.workSchedule.createMany({
            data: [
                { id: 'sched_bsnam_am', doctorId: 'doctor_bsnam', roomId: 'room_101', workDate: d('2026-06-11'), shift: 'AM', startTime: '07:30', endTime: '11:30', maxPatients: 18, isActive: true, note: 'Ca sáng nội tổng quát' },
                { id: 'sched_bshuong_am', doctorId: 'doctor_bshuong', roomId: 'room_102', workDate: d('2026-06-11'), shift: 'AM', startTime: '08:00', endTime: '12:00', maxPatients: 16, isActive: true, note: 'Ca sáng tim mạch' },
            ],
        });
        await tx.patient.createMany({
            data: [
                { id: 'patient_normal', patientCode: 'BN001', fullName: 'Nguyễn Văn An', gender: 'MALE', dateOfBirth: d('1985-03-15'), age: 41, idNumber: '079085001234', phone: '0901234567', address: 'Quận 1, TP.HCM', insuranceNumber: 'BH0012345', isDisabledHeavy: false, isDisabled: false, isRevolutionary: false },
                { id: 'patient_appointment', patientCode: 'BN002', fullName: 'Trần Thị Bình', gender: 'FEMALE', dateOfBirth: d('1990-07-22'), age: 35, idNumber: '079090002345', phone: '0912345678', address: 'Quận 3, TP.HCM', insuranceNumber: 'BH0023456', isDisabledHeavy: false, isDisabled: false, isRevolutionary: false },
                { id: 'patient_child', patientCode: 'BN003', fullName: 'Phạm Thu Hà', gender: 'FEMALE', dateOfBirth: d('2020-04-10'), age: 6, idNumber: null, phone: '0901122334', address: 'Bình Thạnh, TP.HCM', insuranceNumber: null, isDisabledHeavy: false, isDisabled: false, isRevolutionary: false },
                { id: 'patient_elderly', patientCode: 'BN004', fullName: 'Lê Hoàng Mai', gender: 'FEMALE', dateOfBirth: d('1947-09-28'), age: 79, idNumber: '079047004456', phone: '0933445566', address: 'Thủ Đức, TP.HCM', insuranceNumber: 'BH0044567', isDisabledHeavy: false, isDisabled: false, isRevolutionary: false },
                { id: 'patient_pregnant', patientCode: 'BN005', fullName: 'Hoàng Thu Trang', gender: 'FEMALE', dateOfBirth: d('1996-11-11'), age: 29, idNumber: '079096005567', phone: '0966778899', address: 'Quận 10, TP.HCM', insuranceNumber: 'BH0055678', isDisabledHeavy: false, isDisabled: false, isRevolutionary: false },
                { id: 'patient_disabled', patientCode: 'BN006', fullName: 'Đặng Ngọc Anh', gender: 'MALE', dateOfBirth: d('1988-05-19'), age: 37, idNumber: '079088006678', phone: '0977889900', address: 'Gò Vấp, TP.HCM', insuranceNumber: 'BH0066789', isDisabledHeavy: true, isDisabled: true, isRevolutionary: false },
                { id: 'patient_veteran', patientCode: 'BN007', fullName: 'Bùi Khánh Linh', gender: 'FEMALE', dateOfBirth: d('1955-12-25'), age: 70, idNumber: '079055007789', phone: '0911223344', address: 'Phú Nhuận, TP.HCM', insuranceNumber: 'BH0077890', isDisabledHeavy: false, isDisabled: false, isRevolutionary: true },
            ],
        });
        await tx.appointment.createMany({
            data: [
                { id: 'apt_1', patientId: 'patient_appointment', doctorId: 'doctor_bsnam', roomId: 'room_101', scheduleId: 'sched_bsnam_am', appointmentTime: dt('2026-06-11T08:00:00'), serviceId: 'svc_ntq', status: 'CHECKED_IN', note: 'Lịch hẹn buổi sáng, check-in đúng giờ' },
                { id: 'apt_2', patientId: 'patient_veteran', doctorId: 'doctor_bshuong', roomId: 'room_102', scheduleId: 'sched_bshuong_am', appointmentTime: dt('2026-06-11T08:30:00'), serviceId: 'svc_tm', status: 'SCHEDULED', note: 'Bệnh nhân có công, đã đặt lịch trước' },
                { id: 'apt_3', patientId: 'patient_elderly', doctorId: 'doctor_bshuong', roomId: 'room_102', scheduleId: 'sched_bshuong_am', appointmentTime: dt('2026-06-11T09:00:00'), serviceId: 'svc_tm', status: 'LATE', note: 'Đến muộn, chuyển làn thường' },
            ],
        });
        await tx.visit.createMany({
            data: [
                { id: 'visit_normal', patientId: 'patient_normal', appointmentId: null, visitDate: d('2026-06-11'), queueNumber: 'N001', chiefComplaint: 'Đau đầu, chóng mặt', isUrgent: false, isPregnantAtVisit: false, priorityReason: null, arrivedAt: dt('2026-06-11T07:45:00'), checkedInAt: dt('2026-06-11T07:46:00'), createdAt: dt('2026-06-11T07:45:00'), createdById: 'user_letan' },
                { id: 'visit_appointment', patientId: 'patient_appointment', appointmentId: 'apt_1', visitDate: d('2026-06-11'), queueNumber: 'A001', chiefComplaint: 'Khám sức khỏe định kỳ', isUrgent: false, isPregnantAtVisit: false, priorityReason: 'APPOINTMENT', arrivedAt: dt('2026-06-11T07:55:00'), checkedInAt: dt('2026-06-11T08:00:00'), createdAt: dt('2026-06-11T08:00:00'), createdById: 'user_letan' },
                { id: 'visit_child', patientId: 'patient_child', appointmentId: null, visitDate: d('2026-06-11'), queueNumber: 'P001', chiefComplaint: 'Sốt nhẹ, ho', isUrgent: false, isPregnantAtVisit: false, priorityReason: 'CHILD_UNDER_6', arrivedAt: dt('2026-06-11T07:50:00'), checkedInAt: dt('2026-06-11T07:52:00'), createdAt: dt('2026-06-11T07:50:00'), createdById: 'user_letan' },
                { id: 'visit_pregnant', patientId: 'patient_pregnant', appointmentId: null, visitDate: d('2026-06-11'), queueNumber: 'P002', chiefComplaint: 'Khám thai định kỳ', isUrgent: false, isPregnantAtVisit: true, priorityReason: 'PREGNANT', arrivedAt: dt('2026-06-11T08:05:00'), checkedInAt: dt('2026-06-11T08:07:00'), createdAt: dt('2026-06-11T08:05:00'), createdById: 'user_letan' },
                { id: 'visit_in_exam', patientId: 'patient_elderly', appointmentId: 'apt_3', visitDate: d('2026-06-11'), queueNumber: 'P003', chiefComplaint: 'Tức ngực nhẹ', isUrgent: false, isPregnantAtVisit: false, priorityReason: 'ELDERLY_75PLUS', arrivedAt: dt('2026-06-11T08:20:00'), checkedInAt: dt('2026-06-11T08:25:00'), createdAt: dt('2026-06-11T08:20:00'), createdById: 'user_letan' },
                { id: 'visit_waiting_cls', patientId: 'patient_disabled', appointmentId: null, visitDate: d('2026-06-11'), queueNumber: 'P004', chiefComplaint: 'Đau lưng mạn tính', isUrgent: false, isPregnantAtVisit: false, priorityReason: 'DISABLED', arrivedAt: dt('2026-06-11T08:10:00'), checkedInAt: dt('2026-06-11T08:12:00'), createdAt: dt('2026-06-11T08:10:00'), createdById: 'user_letan' },
                { id: 'visit_waiting_result', patientId: 'patient_veteran', appointmentId: 'apt_2', visitDate: d('2026-06-11'), queueNumber: 'N002', chiefComplaint: 'Đau vai gáy', isUrgent: false, isPregnantAtVisit: false, priorityReason: 'AFTER_CLS', arrivedAt: dt('2026-06-11T08:30:00'), checkedInAt: dt('2026-06-11T08:32:00'), createdAt: dt('2026-06-11T08:30:00'), createdById: 'user_letan' },
                { id: 'visit_waiting_conclusion', patientId: 'patient_normal', appointmentId: null, visitDate: d('2026-06-11'), queueNumber: 'N003', chiefComplaint: 'Quay lại kết luận sau CLS', isUrgent: false, isPregnantAtVisit: false, priorityReason: 'AFTER_CLS', arrivedAt: dt('2026-06-11T08:40:00'), checkedInAt: dt('2026-06-11T08:42:00'), createdAt: dt('2026-06-11T08:40:00'), createdById: 'user_dieuphoi' },
                { id: 'visit_waiting_payment', patientId: 'patient_appointment', appointmentId: null, visitDate: d('2026-06-11'), queueNumber: 'N004', chiefComplaint: 'Chờ thanh toán sau kết luận', isUrgent: false, isPregnantAtVisit: false, priorityReason: null, arrivedAt: dt('2026-06-11T09:00:00'), checkedInAt: dt('2026-06-11T09:05:00'), createdAt: dt('2026-06-11T09:00:00'), createdById: 'user_dieuphoi' },
                { id: 'visit_completed', patientId: 'patient_elderly', appointmentId: null, visitDate: d('2026-06-11'), queueNumber: 'N005', chiefComplaint: 'Tái khám tăng huyết áp', isUrgent: false, isPregnantAtVisit: false, priorityReason: null, arrivedAt: dt('2026-06-11T06:55:00'), checkedInAt: dt('2026-06-11T07:00:00'), createdAt: dt('2026-06-11T06:55:00'), createdById: 'user_letan' },
            ],
        });
        await tx.visitProgress.createMany({
            data: [
                { id: 'vp_1', visitId: 'visit_normal', currentState: 'WAITING_EXAM', laneType: 'NORMAL', sameDoctorRequired: false, updatedById: 'user_letan' },
                { id: 'vp_2', visitId: 'visit_appointment', currentState: 'WAITING_EXAM', laneType: 'APPOINTMENT', sameDoctorRequired: false, updatedById: 'user_letan' },
                { id: 'vp_3', visitId: 'visit_child', currentState: 'WAITING_EXAM', laneType: 'PRIORITY', sameDoctorRequired: false, updatedById: 'user_letan' },
                { id: 'vp_4', visitId: 'visit_pregnant', currentState: 'WAITING_EXAM', laneType: 'PRIORITY', sameDoctorRequired: false, updatedById: 'user_letan' },
                { id: 'vp_5', visitId: 'visit_in_exam', currentState: 'IN_EXAM', laneType: 'PRIORITY', sameDoctorRequired: false, updatedById: 'user_bsnam' },
                { id: 'vp_6', visitId: 'visit_waiting_cls', currentState: 'WAITING_CLS', laneType: 'PRIORITY', sameDoctorRequired: false, updatedById: 'user_bsnam' },
                { id: 'vp_7', visitId: 'visit_waiting_result', currentState: 'WAITING_RESULT', laneType: 'AFTER_CLS', sameDoctorRequired: false, updatedById: 'user_ktvxn' },
                { id: 'vp_8', visitId: 'visit_waiting_conclusion', currentState: 'WAITING_CONCLUSION', laneType: 'AFTER_CLS', sameDoctorRequired: true, updatedById: 'user_bsnam' },
                { id: 'vp_9', visitId: 'visit_waiting_payment', currentState: 'WAITING_PAYMENT', laneType: 'NORMAL', sameDoctorRequired: false, updatedById: 'user_dieuphoi' },
                { id: 'vp_10', visitId: 'visit_completed', currentState: 'COMPLETED', laneType: 'NORMAL', sameDoctorRequired: false, updatedById: 'user_letan' },
            ],
        });
        await tx.visitStateHistory.createMany({
            data: [
                { id: 'vsh_1', visitId: 'visit_normal', toState: 'WAITING_EXAM', triggerEvent: 'RECEPTION_CREATE_VISIT', triggeredById: 'user_letan', transitionedAt: dt('2026-06-11T07:45:00'), note: 'Tiếp nhận tại quầy' },
                { id: 'vsh_2', visitId: 'visit_appointment', toState: 'WAITING_EXAM', triggerEvent: 'CHECK_IN', triggeredById: 'user_letan', transitionedAt: dt('2026-06-11T08:00:00'), note: 'Check-in đúng giờ' },
                { id: 'vsh_3', visitId: 'visit_appointment', fromState: 'WAITING_EXAM', toState: 'IN_EXAM', triggerEvent: 'CALL_PATIENT', triggeredById: 'user_bsnam', transitionedAt: dt('2026-06-11T08:12:00'), note: 'Bác sĩ gọi vào phòng' },
                { id: 'vsh_4', visitId: 'visit_waiting_cls', fromState: 'IN_EXAM', toState: 'WAITING_CLS', triggerEvent: 'ORDER_CLS', triggeredById: 'user_bsnam', transitionedAt: dt('2026-06-11T08:35:00'), note: 'Chỉ định CLS' },
                { id: 'vsh_5', visitId: 'visit_waiting_result', fromState: 'WAITING_CLS', toState: 'WAITING_RESULT', triggerEvent: 'CLS_COMPLETED', triggeredById: 'user_ktvxn', transitionedAt: dt('2026-06-11T09:10:00'), note: 'Đợi trả kết quả' },
                { id: 'vsh_6', visitId: 'visit_waiting_conclusion', fromState: 'WAITING_RESULT', toState: 'WAITING_CONCLUSION', triggerEvent: 'RETURN_TO_DOCTOR', triggeredById: 'user_dieuphoi', transitionedAt: dt('2026-06-11T09:20:00'), note: 'Quay lại bác sĩ để kết luận' },
                { id: 'vsh_7', visitId: 'visit_waiting_payment', fromState: 'WAITING_CONCLUSION', toState: 'WAITING_PAYMENT', triggerEvent: 'COMPLETE_CONCLUSION', triggeredById: 'user_bsnam', transitionedAt: dt('2026-06-11T09:40:00'), note: 'Chuyển sang thanh toán' },
                { id: 'vsh_8', visitId: 'visit_completed', fromState: 'WAITING_PAYMENT', toState: 'COMPLETED', triggerEvent: 'PAYMENT_DONE', triggeredById: 'user_letan', transitionedAt: dt('2026-06-11T08:50:00'), note: 'Hoàn tất lượt khám' },
            ],
        });
        await tx.visitClinical.createMany({
            data: [
                { id: 'vc_1', visitId: 'visit_normal', provisionalDiagnosis: 'Theo dõi đau đầu do căng thẳng', clinicalNotes: 'Khám ban đầu', examStartAt: dt('2026-06-11T07:50:00'), updatedAt: dt('2026-06-11T08:00:00') },
                { id: 'vc_2', visitId: 'visit_appointment', provisionalDiagnosis: 'Khám sức khỏe định kỳ', clinicalNotes: 'Lịch hẹn đúng giờ', examStartAt: dt('2026-06-11T08:12:00'), updatedAt: dt('2026-06-11T08:20:00') },
                { id: 'vc_3', visitId: 'visit_child', provisionalDiagnosis: 'Theo dõi sốt siêu vi', clinicalNotes: 'Ưu tiên trẻ em', examStartAt: dt('2026-06-11T07:58:00'), updatedAt: dt('2026-06-11T08:05:00') },
                { id: 'vc_4', visitId: 'visit_pregnant', provisionalDiagnosis: 'Khám thai định kỳ', clinicalNotes: 'Bệnh nhân có thai - ưu tiên', examStartAt: dt('2026-06-11T08:08:00'), updatedAt: dt('2026-06-11T08:15:00') },
                { id: 'vc_5', visitId: 'visit_in_exam', provisionalDiagnosis: 'Đau ngực nhẹ, cần theo dõi', clinicalNotes: 'Đang khám', examStartAt: dt('2026-06-11T08:25:00'), updatedAt: dt('2026-06-11T08:30:00') },
                { id: 'vc_6', visitId: 'visit_waiting_cls', provisionalDiagnosis: 'Đau lưng mạn tính', clinicalNotes: 'Đang chờ CLS', examStartAt: dt('2026-06-11T08:35:00'), clsStartAt: dt('2026-06-11T08:50:00'), updatedAt: dt('2026-06-11T09:00:00') },
                { id: 'vc_7', visitId: 'visit_waiting_result', provisionalDiagnosis: 'Đau vai gáy', clinicalNotes: 'Đã hoàn tất CLS, chờ kết quả', examStartAt: dt('2026-06-11T08:40:00'), clsStartAt: dt('2026-06-11T08:55:00'), updatedAt: dt('2026-06-11T09:15:00') },
                { id: 'vc_8', visitId: 'visit_waiting_conclusion', provisionalDiagnosis: 'Kết quả CLS khả nghi', clinicalNotes: 'Quay lại bác sĩ', clsDoneAt: dt('2026-06-11T09:10:00'), conclusionStartAt: dt('2026-06-11T09:20:00'), updatedAt: dt('2026-06-11T09:25:00') },
                { id: 'vc_9', visitId: 'visit_waiting_payment', finalDiagnosis: 'Viêm họng cấp', conclusion: 'Kê đơn 5 ngày', clinicalNotes: 'Chờ thanh toán', examStartAt: dt('2026-06-11T09:00:00'), completedAt: dt('2026-06-11T09:45:00'), updatedAt: dt('2026-06-11T09:45:00') },
                { id: 'vc_10', visitId: 'visit_completed', finalDiagnosis: 'Tăng huyết áp ổn định', conclusion: 'Theo dõi định kỳ', clinicalNotes: 'Hoàn tất', examStartAt: dt('2026-06-11T07:05:00'), completedAt: dt('2026-06-11T08:50:00'), totalWaitMinutes: 18, totalVisitMinutes: 105, updatedAt: dt('2026-06-11T08:50:00') },
            ],
        });
        await tx.visitAssignment.createMany({
            data: [
                { id: 'va_1', visitId: 'visit_normal', doctorId: 'doctor_bsnam', roomId: 'room_101', assignedById: 'user_letan', isCurrent: true, assignmentReason: 'Tiếp nhận tại quầy' },
                { id: 'va_2', visitId: 'visit_appointment', doctorId: 'doctor_bsnam', roomId: 'room_101', assignedById: 'user_letan', isCurrent: true, assignmentReason: 'Theo lịch hẹn' },
                { id: 'va_3', visitId: 'visit_child', doctorId: 'doctor_bshuong', roomId: 'room_103', assignedById: 'user_letan', isCurrent: true, assignmentReason: 'Ưu tiên nhi khoa' },
                { id: 'va_4', visitId: 'visit_pregnant', doctorId: 'doctor_bshuong', roomId: 'room_102', assignedById: 'user_letan', isCurrent: true, assignmentReason: 'Ưu tiên thai kỳ' },
                { id: 'va_5', visitId: 'visit_in_exam', doctorId: 'doctor_bshuong', roomId: 'room_102', assignedById: 'user_letan', isCurrent: true, assignmentReason: 'Đang khám' },
                { id: 'va_6', visitId: 'visit_waiting_cls', doctorId: 'doctor_bsnam', roomId: 'room_lab', assignedById: 'user_bsnam', isCurrent: true, assignmentReason: 'Chỉ định CLS' },
                { id: 'va_7', visitId: 'visit_waiting_result', doctorId: 'doctor_bsnam', roomId: 'room_lab', assignedById: 'user_ktvxn', isCurrent: true, assignmentReason: 'Chờ kết quả' },
                { id: 'va_8', visitId: 'visit_waiting_conclusion', doctorId: 'doctor_bsnam', roomId: 'room_101', assignedById: 'user_dieuphoi', isCurrent: true, assignmentReason: 'Kết luận sau CLS' },
                { id: 'va_9', visitId: 'visit_waiting_payment', doctorId: 'doctor_bsnam', roomId: 'room_101', assignedById: 'user_dieuphoi', isCurrent: true, assignmentReason: 'Thanh toán' },
                { id: 'va_10', visitId: 'visit_completed', doctorId: 'doctor_bsnam', roomId: 'room_101', assignedById: 'user_letan', isCurrent: true, assignmentReason: 'Hoàn tất' },
            ],
        });
        await tx.queueItem.createMany({
            data: [
                { id: 'qi_1', visitId: 'visit_normal', queueType: 'EXAM', laneType: 'NORMAL', targetRoomId: 'room_101', targetDoctorId: 'doctor_bsnam', isBase: true, isUrgent: false, isAgePriority: false, isPregnantPriority: false, priorityReason: null, initialPriorityScore: 50, appointmentTime: null, enqueuedAt: dt('2026-06-11T07:46:00'), createdById: 'user_letan', sameDoctorRequired: false },
                { id: 'qi_2', visitId: 'visit_appointment', queueType: 'EXAM', laneType: 'APPOINTMENT', targetRoomId: 'room_101', targetDoctorId: 'doctor_bsnam', isBase: true, isUrgent: false, isAgePriority: false, isPregnantPriority: false, priorityReason: 'APPOINTMENT', initialPriorityScore: 60, appointmentTime: dt('2026-06-11T08:00:00'), enqueuedAt: dt('2026-06-11T08:00:00'), createdById: 'user_letan', sameDoctorRequired: false },
                { id: 'qi_3', visitId: 'visit_child', queueType: 'EXAM', laneType: 'PRIORITY', targetRoomId: 'room_103', targetDoctorId: 'doctor_bshuong', isBase: true, isUrgent: false, isAgePriority: true, isPregnantPriority: false, priorityReason: 'CHILD_UNDER_6', initialPriorityScore: 95, appointmentTime: null, enqueuedAt: dt('2026-06-11T07:52:00'), createdById: 'user_letan', sameDoctorRequired: false },
                { id: 'qi_4', visitId: 'visit_pregnant', queueType: 'EXAM', laneType: 'PRIORITY', targetRoomId: 'room_102', targetDoctorId: 'doctor_bshuong', isBase: true, isUrgent: false, isAgePriority: false, isPregnantPriority: true, priorityReason: 'PREGNANT', initialPriorityScore: 98, appointmentTime: null, enqueuedAt: dt('2026-06-11T08:07:00'), createdById: 'user_letan', sameDoctorRequired: false },
                { id: 'qi_5', visitId: 'visit_in_exam', queueType: 'EXAM', laneType: 'PRIORITY', targetRoomId: 'room_102', targetDoctorId: 'doctor_bshuong', isBase: true, isUrgent: false, isAgePriority: true, isPregnantPriority: false, priorityReason: 'ELDERLY_75PLUS', initialPriorityScore: 90, appointmentTime: dt('2026-06-11T08:30:00'), enqueuedAt: dt('2026-06-11T08:25:00'), createdById: 'user_letan', sameDoctorRequired: false },
                { id: 'qi_6', visitId: 'visit_waiting_cls', queueType: 'CLS', laneType: 'PRIORITY', targetRoomId: 'room_lab', targetDoctorId: null, isBase: false, isUrgent: false, isAgePriority: false, isPregnantPriority: false, priorityReason: 'DISABLED', initialPriorityScore: 88, appointmentTime: null, enqueuedAt: dt('2026-06-11T08:50:00'), createdById: 'user_bsnam', sameDoctorRequired: false },
                { id: 'qi_7', visitId: 'visit_waiting_result', queueType: 'CLS', laneType: 'AFTER_CLS', targetRoomId: 'room_lab', targetDoctorId: null, isBase: false, isUrgent: false, isAgePriority: false, isPregnantPriority: false, priorityReason: 'AFTER_CLS', initialPriorityScore: 72, appointmentTime: null, enqueuedAt: dt('2026-06-11T08:55:00'), createdById: 'user_ktvxn', sameDoctorRequired: false },
                { id: 'qi_8', visitId: 'visit_waiting_conclusion', queueType: 'CONCLUSION', laneType: 'AFTER_CLS', targetRoomId: 'room_101', targetDoctorId: 'doctor_bsnam', isBase: false, isUrgent: false, isAgePriority: false, isPregnantPriority: false, priorityReason: 'AFTER_CLS', initialPriorityScore: 74, appointmentTime: null, enqueuedAt: dt('2026-06-11T09:10:00'), createdById: 'user_dieuphoi', sameDoctorRequired: true },
                { id: 'qi_9', visitId: 'visit_waiting_payment', queueType: 'PAYMENT', laneType: 'NORMAL', targetRoomId: 'room_101', targetDoctorId: null, isBase: false, isUrgent: false, isAgePriority: false, isPregnantPriority: false, priorityReason: null, initialPriorityScore: 50, appointmentTime: null, enqueuedAt: dt('2026-06-11T09:40:00'), createdById: 'user_dieuphoi', sameDoctorRequired: false },
                { id: 'qi_10', visitId: 'visit_completed', queueType: 'PAYMENT', laneType: 'NORMAL', targetRoomId: 'room_101', targetDoctorId: null, isBase: false, isUrgent: false, isAgePriority: false, isPregnantPriority: false, priorityReason: null, initialPriorityScore: 50, appointmentTime: null, enqueuedAt: dt('2026-06-11T08:45:00'), createdById: 'user_letan', sameDoctorRequired: false },
            ],
        });
        await tx.queueItemStatus.createMany({
            data: [
                { id: 'qis_1', queueItemId: 'qi_1', status: 'WAITING', priorityScore: 50, lastScoreUpdated: dt('2026-06-11T07:46:00'), calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false, updatedById: 'user_letan' },
                { id: 'qis_2', queueItemId: 'qi_2', status: 'CALLED', priorityScore: 60, lastScoreUpdated: dt('2026-06-11T08:05:00'), calledAt: dt('2026-06-11T08:06:00'), servedAt: null, dequeuedAt: null, isTimeout: false, updatedById: 'user_bsnam' },
                { id: 'qis_3', queueItemId: 'qi_3', status: 'WAITING', priorityScore: 95, lastScoreUpdated: dt('2026-06-11T07:52:00'), calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false, updatedById: 'user_letan' },
                { id: 'qis_4', queueItemId: 'qi_4', status: 'WAITING', priorityScore: 98, lastScoreUpdated: dt('2026-06-11T08:07:00'), calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false, updatedById: 'user_letan' },
                { id: 'qis_5', queueItemId: 'qi_5', status: 'SERVING', priorityScore: 90, lastScoreUpdated: dt('2026-06-11T08:25:00'), calledAt: dt('2026-06-11T08:26:00'), servedAt: dt('2026-06-11T08:30:00'), dequeuedAt: null, isTimeout: false, updatedById: 'user_bsnam' },
                { id: 'qis_6', queueItemId: 'qi_6', status: 'WAITING', priorityScore: 88, lastScoreUpdated: dt('2026-06-11T08:50:00'), calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false, updatedById: 'user_bsnam' },
                { id: 'qis_7', queueItemId: 'qi_7', status: 'WAITING', priorityScore: 72, lastScoreUpdated: dt('2026-06-11T08:55:00'), calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false, updatedById: 'user_ktvxn' },
                { id: 'qis_8', queueItemId: 'qi_8', status: 'WAITING', priorityScore: 74, lastScoreUpdated: dt('2026-06-11T09:10:00'), calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false, updatedById: 'user_dieuphoi' },
                { id: 'qis_9', queueItemId: 'qi_9', status: 'WAITING', priorityScore: 50, lastScoreUpdated: dt('2026-06-11T09:40:00'), calledAt: null, servedAt: null, dequeuedAt: null, isTimeout: false, updatedById: 'user_dieuphoi' },
                { id: 'qis_10', queueItemId: 'qi_10', status: 'DONE', priorityScore: 50, lastScoreUpdated: dt('2026-06-11T08:50:00'), calledAt: dt('2026-06-11T08:45:00'), servedAt: dt('2026-06-11T08:50:00'), dequeuedAt: dt('2026-06-11T08:50:00'), isTimeout: false, updatedById: 'user_letan' },
            ],
        });
        await tx.queueItemHistory.createMany({
            data: [
                { id: 'qih_1', queueItemId: 'qi_1', eventType: 'QUEUED', fromStatus: null, toStatus: 'WAITING', fromScore: null, toScore: 50, eventTime: dt('2026-06-11T07:46:00'), triggeredBy: 'reception', triggeredByUserId: 'user_letan', note: 'Tạo lượt khám tại quầy' },
                { id: 'qih_2', queueItemId: 'qi_2', eventType: 'CALLED', fromStatus: 'WAITING', toStatus: 'CALLED', fromScore: 60, toScore: 60, eventTime: dt('2026-06-11T08:06:00'), triggeredBy: 'doctor', triggeredByUserId: 'user_bsnam', note: 'Gọi bệnh nhân vào phòng' },
                { id: 'qih_3', queueItemId: 'qi_5', eventType: 'START_SERVICE', fromStatus: 'CALLED', toStatus: 'SERVING', fromScore: 90, toScore: 90, eventTime: dt('2026-06-11T08:30:00'), triggeredBy: 'doctor', triggeredByUserId: 'user_bsnam', note: 'Bắt đầu khám' },
                { id: 'qih_4', queueItemId: 'qi_6', eventType: 'ORDER_CLS', fromStatus: 'WAITING', toStatus: 'WAITING', fromScore: 88, toScore: 88, eventTime: dt('2026-06-11T08:50:00'), triggeredBy: 'doctor', triggeredByUserId: 'user_bsnam', note: 'Đưa vào hàng chờ CLS' },
                { id: 'qih_5', queueItemId: 'qi_8', eventType: 'RETURN_TO_DOCTOR', fromStatus: 'WAITING', toStatus: 'WAITING', fromScore: 74, toScore: 74, eventTime: dt('2026-06-11T09:10:00'), triggeredBy: 'coordinator', triggeredByUserId: 'user_dieuphoi', note: 'Quay lại bác sĩ để kết luận' },
            ],
        });
        await tx.turn.createMany({
            data: [
                { id: 'turn_1', visitId: 'visit_normal', roomId: 'room_101', doctorId: 'doctor_bsnam', queueItemId: 'qi_1', turnType: 'CLINICAL_EXAM', serviceId: 'svc_ntq', timeoutThreshold: 20, createdAt: dt('2026-06-11T07:50:00'), createdById: 'user_bsnam' },
                { id: 'turn_2', visitId: 'visit_waiting_cls', roomId: 'room_lab', doctorId: null, queueItemId: 'qi_6', turnType: 'CLS_LAB', serviceId: 'svc_blood', timeoutThreshold: 15, createdAt: dt('2026-06-11T08:50:00'), createdById: 'user_ktvxn' },
                { id: 'turn_3', visitId: 'visit_waiting_conclusion', roomId: 'room_101', doctorId: 'doctor_bsnam', queueItemId: 'qi_8', turnType: 'CONCLUSION', serviceId: 'svc_ntq', timeoutThreshold: 25, createdAt: dt('2026-06-11T09:20:00'), createdById: 'user_dieuphoi' },
                { id: 'turn_4', visitId: 'visit_waiting_payment', roomId: 'room_101', doctorId: null, queueItemId: 'qi_9', turnType: 'PAYMENT', serviceId: null, timeoutThreshold: 10, createdAt: dt('2026-06-11T09:40:00'), createdById: 'user_dieuphoi' },
            ],
        });
        await tx.turnProgress.createMany({
            data: [
                { id: 'tp_1', turnId: 'turn_1', status: 'COMPLETED', calledAt: dt('2026-06-11T07:50:00'), startedAt: dt('2026-06-11T07:52:00'), endedAt: dt('2026-06-11T08:15:00'), timeoutAt: null, durationMinutes: 23, note: 'Khám xong', updatedById: 'user_bsnam' },
                { id: 'tp_2', turnId: 'turn_2', status: 'IN_PROGRESS', calledAt: dt('2026-06-11T08:50:00'), startedAt: dt('2026-06-11T08:55:00'), endedAt: null, timeoutAt: null, durationMinutes: null, note: 'Đang thực hiện xét nghiệm', updatedById: 'user_ktvxn' },
                { id: 'tp_3', turnId: 'turn_3', status: 'PENDING', calledAt: null, startedAt: null, endedAt: null, timeoutAt: null, durationMinutes: null, note: 'Chờ gọi vào phòng', updatedById: 'user_dieuphoi' },
                { id: 'tp_4', turnId: 'turn_4', status: 'CALLED', calledAt: dt('2026-06-11T09:42:00'), startedAt: null, endedAt: null, timeoutAt: null, durationMinutes: null, note: 'Đang chờ thanh toán', updatedById: 'user_dieuphoi' },
            ],
        });
        await tx.cLSOrder.createMany({
            data: [
                { id: 'cls_1', visitId: 'visit_waiting_cls', orderedById: 'doctor_bsnam', serviceId: 'svc_blood', roomId: 'room_lab', priority: 'ROUTINE', status: 'PENDING', orderedAt: dt('2026-06-11T08:35:00'), clinicalNote: 'Xét nghiệm máu cơ bản', note: 'Theo dõi đau lưng' },
                { id: 'cls_2', visitId: 'visit_waiting_cls', orderedById: 'doctor_bsnam', serviceId: 'svc_xray', roomId: 'room_xray', priority: 'URGENT', status: 'IN_PROGRESS', orderedAt: dt('2026-06-11T08:36:00'), clinicalNote: 'Chụp X-quang cột sống', note: 'Loại trừ tổn thương cơ xương' },
                { id: 'cls_3', visitId: 'visit_waiting_result', orderedById: 'doctor_bshuong', serviceId: 'svc_us', roomId: 'room_us', priority: 'ROUTINE', status: 'COMPLETED', orderedAt: dt('2026-06-11T08:55:00'), completedAt: dt('2026-06-11T09:05:00'), clinicalNote: 'Siêu âm hỗ trợ chẩn đoán', note: 'Kết quả chờ đọc' },
                { id: 'cls_4', visitId: 'visit_waiting_result', orderedById: 'doctor_bshuong', serviceId: 'svc_ecg', roomId: 'room_lab', priority: 'ROUTINE', status: 'COMPLETED', orderedAt: dt('2026-06-11T08:56:00'), completedAt: dt('2026-06-11T09:06:00'), clinicalNote: 'Điện tim', note: 'Kết quả chờ đọc' },
            ],
        });
        await tx.cLSResult.createMany({
            data: [
                { id: 'clr_1', clsOrderId: 'cls_3', resultDate: d('2026-06-11'), resultFileUrl: null, resultText: 'Siêu âm ổ bụng chưa ghi nhận bất thường rõ. Cần đối chiếu lâm sàng.', resultAt: dt('2026-06-11T09:05:00'), resultById: 'user_ktvxn', isAbnormal: false, note: 'Bình thường' },
                { id: 'clr_2', clsOrderId: 'cls_4', resultDate: d('2026-06-11'), resultFileUrl: null, resultText: 'Điện tim có dấu hiệu nhịp xoang nhanh nhẹ.', resultAt: dt('2026-06-11T09:06:00'), resultById: 'user_ktvxn', isAbnormal: true, note: 'Bất thường nhẹ' },
            ],
        });
        await tx.resourceLoad.createMany({
            data: [
                { id: 'rl_1', roomId: 'room_101', recordedAt: dt('2026-06-11T08:00:00'), currentLoad: 6, queueLength: 6, utilizationRate: 0.4, waitTimeRatio: 0.9, queuePressure: 0.3, avgActualWait: 18, avgServiceTime: 15, alertLevel: 'NORMAL', doctorAvailable: 1, isActive: true },
                { id: 'rl_2', roomId: 'room_102', recordedAt: dt('2026-06-11T08:00:00'), currentLoad: 10, queueLength: 10, utilizationRate: 0.83, waitTimeRatio: 1.4, queuePressure: 0.7, avgActualWait: 38, avgServiceTime: 20, alertLevel: 'WARNING', doctorAvailable: 1, isActive: true },
                { id: 'rl_3', roomId: 'room_103', recordedAt: dt('2026-06-11T08:00:00'), currentLoad: 12, queueLength: 12, utilizationRate: 1.0, waitTimeRatio: 1.9, queuePressure: 0.95, avgActualWait: 68, avgServiceTime: 12, alertLevel: 'OVERLOAD', doctorAvailable: 1, isActive: true },
            ],
        });
        await tx.queueSnapshot.createMany({
            data: [
                { id: 'qs_1', roomId: 'room_101', snapshotTime: dt('2026-06-11T08:00:00'), queueTime: 18, utilizationRate: 0.4, waitTimeRatio: 0.9, avgWaitMinutes: 18, laneAppointmentCount: 1, laneAfterClsCount: 1, lanePriorityCount: 2, laneNormalCount: 2, alertLevel: 'NORMAL' },
                { id: 'qs_2', roomId: 'room_102', snapshotTime: dt('2026-06-11T08:00:00'), queueTime: 38, utilizationRate: 0.83, waitTimeRatio: 1.4, avgWaitMinutes: 38, laneAppointmentCount: 1, laneAfterClsCount: 1, lanePriorityCount: 4, laneNormalCount: 4, alertLevel: 'WARNING' },
                { id: 'qs_3', roomId: 'room_103', snapshotTime: dt('2026-06-11T08:00:00'), queueTime: 68, utilizationRate: 1.0, waitTimeRatio: 1.9, avgWaitMinutes: 68, laneAppointmentCount: 0, laneAfterClsCount: 1, lanePriorityCount: 7, laneNormalCount: 4, alertLevel: 'OVERLOAD' },
            ],
        });
        await tx.dispatchDecision.createMany({
            data: [
                { id: 'dd_1', visitId: 'visit_waiting_cls', queueItemId: 'qi_6', decisionById: 'user_dieuphoi', decisionTime: dt('2026-06-11T08:40:00'), decisionType: 'SYSTEM_SUGGESTED', outcomeRoomId: 'room_lab', outcomeDoctorId: null, note: 'Hệ thống gợi ý chuyển sang phòng xét nghiệm ít tải hơn' },
                { id: 'dd_2', visitId: 'visit_waiting_conclusion', queueItemId: 'qi_8', decisionById: 'user_dieuphoi', decisionTime: dt('2026-06-11T09:20:00'), decisionType: 'MANUAL', outcomeRoomId: 'room_101', outcomeDoctorId: 'doctor_bsnam', note: 'Nhân viên xác nhận quay lại đúng bác sĩ' },
            ],
        });
        await tx.dispatchRecommendation.createMany({
            data: [
                { id: 'dr_1', decisionId: 'dd_1', rank: 1, roomId: 'room_lab', resourceScore: 0.82, queueLength: 3, utilizationRate: 0.55, estimatedWaitMinutes: 12, alertLevel: 'NORMAL', reason: 'Ít bệnh nhân chờ', wasSelected: true },
                { id: 'dr_2', decisionId: 'dd_1', rank: 2, roomId: 'room_xray', resourceScore: 0.76, queueLength: 4, utilizationRate: 0.62, estimatedWaitMinutes: 18, alertLevel: 'NORMAL', reason: 'Thời gian chờ thấp', wasSelected: false },
                { id: 'dr_3', decisionId: 'dd_1', rank: 3, roomId: 'room_us', resourceScore: 0.70, queueLength: 5, utilizationRate: 0.68, estimatedWaitMinutes: 22, alertLevel: 'WARNING', reason: 'Đang hoạt động', wasSelected: false },
                { id: 'dr_4', decisionId: 'dd_2', rank: 1, roomId: 'room_101', resourceScore: 0.93, queueLength: 2, utilizationRate: 0.35, estimatedWaitMinutes: 10, alertLevel: 'NORMAL', reason: 'Cùng bác sĩ phụ trách', wasSelected: true },
                { id: 'dr_5', decisionId: 'dd_2', rank: 2, roomId: 'room_102', resourceScore: 0.78, queueLength: 4, utilizationRate: 0.45, estimatedWaitMinutes: 15, alertLevel: 'NORMAL', reason: 'Ít bệnh nhân chờ', wasSelected: false },
                { id: 'dr_6', decisionId: 'dd_2', rank: 3, roomId: 'room_103', resourceScore: 0.61, queueLength: 8, utilizationRate: 0.88, estimatedWaitMinutes: 32, alertLevel: 'WARNING', reason: 'Đang hoạt động', wasSelected: false },
            ],
        });
        await tx.dispatchOutcome.createMany({
            data: [
                { id: 'do_1', decisionId: 'dd_1', serviceId: 'svc_blood', followedRecommendation: true, deviationNote: null, actualWaitMinutes: 12, recommendedWaitEstimate: 12, waitDifference: 0, deviationReason: null },
                { id: 'do_2', decisionId: 'dd_2', serviceId: 'svc_ntq', followedRecommendation: false, deviationNote: 'Nhân viên điều phối chọn giữ bệnh nhân tại phòng cũ', actualWaitMinutes: 18, recommendedWaitEstimate: 10, waitDifference: 8, deviationReason: 'Ưu tiên duy trì cùng bác sĩ' },
            ],
        });
        await tx.escalationLog.createMany({
            data: [
                { id: 'es_1', visitId: 'visit_pregnant', escalatedById: 'user_letan', escalationTime: dt('2026-06-11T08:07:30'), escalationType: 'PRIORITY_OVERRIDE', fromLane: 'NORMAL', toLane: 'PRIORITY', fromPriorityScore: 50, toPriorityScore: 98, reason: 'Phụ nữ có thai - ưu tiên pháp lý', outcome: 'Đã chuyển sang làn ưu tiên' },
            ],
        });
        await tx.invoice.createMany({
            data: [
                { id: 'inv_1', visitId: 'visit_waiting_payment', totalAmount: money(330000), paidAmount: money(0), status: 'UNPAID', paymentMethod: null, createdAt: dt('2026-06-11T09:42:00'), paidAt: null },
                { id: 'inv_2', visitId: 'visit_completed', totalAmount: money(300000), paidAmount: money(300000), status: 'PAID', paymentMethod: 'CASH', createdAt: dt('2026-06-11T08:45:00'), paidAt: dt('2026-06-11T08:50:00') },
            ],
        });
        await tx.invoiceItem.createMany({
            data: [
                { id: 'invitem_1', invoiceId: 'inv_1', serviceId: 'svc_ntq', description: 'Khám nội tổng quát', quantity: 1, unitPrice: money(150000), totalPrice: money(150000) },
                { id: 'invitem_2', invoiceId: 'inv_1', serviceId: 'svc_blood', description: 'Xét nghiệm máu', quantity: 1, unitPrice: money(180000), totalPrice: money(180000) },
                { id: 'invitem_3', invoiceId: 'inv_2', serviceId: 'svc_ntq', description: 'Khám nội tổng quát', quantity: 1, unitPrice: money(150000), totalPrice: money(150000) },
                { id: 'invitem_4', invoiceId: 'inv_2', serviceId: 'svc_xray', description: 'X-quang', quantity: 1, unitPrice: money(150000), totalPrice: money(150000) },
            ],
        });
    });
}
main()
    .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed successfully.');
})
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
