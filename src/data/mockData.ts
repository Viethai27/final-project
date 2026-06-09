import type {
  User, Patient, Doctor, Room, Service, Visit, QueueItem,
  CLSOrder, CLSResult, Invoice, Appointment, StatusHistoryEntry,
  DispatchHistoryEntry, RoomSnapshot, DashboardStats
} from '../types';

// ===== USERS =====
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Nguyễn Văn Quản Trị', username: 'admin', role: 'ADMIN', department: 'Ban Giám Đốc' },
  { id: 'u2', name: 'Trần Thị Lễ Tân', username: 'letan', role: 'RECEPTIONIST', department: 'Tiếp Nhận' },
  { id: 'u3', name: 'Lê Văn Điều Phối', username: 'dieuphoi', role: 'COORDINATOR', department: 'Điều Dưỡng' },
  { id: 'u4', name: 'BS. Phạm Hoài Nam', username: 'bsnam', role: 'DOCTOR', department: 'Nội Tổng Quát', roomId: 'r1' },
  { id: 'u5', name: 'BS. Nguyễn Thu Hương', username: 'bshuong', role: 'DOCTOR', department: 'Tim Mạch', roomId: 'r2' },
  { id: 'u6', name: 'BS. Lê Đức Minh', username: 'bsminh', role: 'DOCTOR', department: 'Nhi Khoa', roomId: 'r3' },
  { id: 'u7', name: 'Kỹ thuật viên XN', username: 'ktvxn', role: 'LAB_STAFF', department: 'Xét Nghiệm', roomId: 'r9' },
  { id: 'u8', name: 'Nguyễn Thị Quản Lý', username: 'quanly', role: 'MANAGER', department: 'Ban Giám Đốc' },
];

// ===== DEMO ACCOUNTS =====
export const DEMO_CREDENTIALS: Record<string, { password: string; userId: string }> = {
  admin: { password: 'admin123', userId: 'u1' },
  letan: { password: 'letan123', userId: 'u2' },
  dieuphoi: { password: 'dp123', userId: 'u3' },
  bsnam: { password: 'bs123', userId: 'u4' },
  bshuong: { password: 'bs123', userId: 'u5' },
  bsminh: { password: 'bs123', userId: 'u6' },
  ktvxn: { password: 'ktv123', userId: 'u7' },
  quanly: { password: 'ql123', userId: 'u8' },
};

// ===== PATIENTS =====
export const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', patientCode: 'BN001', name: 'Nguyễn Văn An', dateOfBirth: '1985-03-15', age: 39, gender: 'MALE', idNumber: '079085001234', phone: '0901234567', address: 'Q1, TP.HCM', insurance: 'DN4512345' },
  { id: 'p2', patientCode: 'BN002', name: 'Trần Thị Bình', dateOfBirth: '1990-07-22', age: 34, gender: 'FEMALE', idNumber: '079090002345', phone: '0912345678', address: 'Q3, TP.HCM', priorityReason: 'PREGNANT' },
  { id: 'p3', patientCode: 'BN003', name: 'Lê Văn Cường', dateOfBirth: '1945-11-08', age: 79, gender: 'MALE', idNumber: '079045003456', phone: '0923456789', address: 'Q5, TP.HCM', insurance: 'HS9876543', priorityReason: 'ELDERLY_75PLUS' },
  { id: 'p4', patientCode: 'BN004', name: 'Phạm Thị Dung', dateOfBirth: '2020-04-10', age: 4, gender: 'FEMALE', idNumber: '', phone: '0934567890', address: 'Bình Thạnh, TP.HCM', priorityReason: 'CHILD_UNDER_6' },
  { id: 'p5', patientCode: 'BN005', name: 'Hoàng Minh Đức', dateOfBirth: '1978-09-28', age: 46, gender: 'MALE', idNumber: '079078005678', phone: '0945678901', address: 'Q7, TP.HCM', insurance: 'BH1234567' },
  { id: 'p6', patientCode: 'BN006', name: 'Nguyễn Thị Hoa', dateOfBirth: '1965-01-14', age: 59, gender: 'FEMALE', idNumber: '079065006789', phone: '0956789012', address: 'Tân Bình, TP.HCM', priorityReason: 'VETERAN' },
  { id: 'p7', patientCode: 'BN007', name: 'Vũ Văn Hùng', dateOfBirth: '1992-06-03', age: 32, gender: 'MALE', idNumber: '079092007890', phone: '0967890123', address: 'Gò Vấp, TP.HCM' },
  { id: 'p8', patientCode: 'BN008', name: 'Đặng Thị Kim', dateOfBirth: '1955-12-25', age: 69, gender: 'FEMALE', idNumber: '079055008901', phone: '0978901234', address: 'Q10, TP.HCM', insurance: 'HT5678901' },
  { id: 'p9', patientCode: 'BN009', name: 'Bùi Quốc Long', dateOfBirth: '2000-08-17', age: 24, gender: 'MALE', idNumber: '079000009012', phone: '0989012345', address: 'Thủ Đức, TP.HCM' },
  { id: 'p10', patientCode: 'BN010', name: 'Lý Thị Mai', dateOfBirth: '1988-05-30', age: 36, gender: 'FEMALE', idNumber: '079088010123', phone: '0990123456', address: 'Phú Nhuận, TP.HCM', priorityReason: 'DISABLED' },
  { id: 'p11', patientCode: 'BN011', name: 'Trương Văn Nam', dateOfBirth: '1972-02-19', age: 52, gender: 'MALE', idNumber: '079072011234', phone: '0901234568', address: 'Q4, TP.HCM', insurance: 'QD2345678' },
  { id: 'p12', patientCode: 'BN012', name: 'Võ Thị Oanh', dateOfBirth: '1995-10-07', age: 29, gender: 'FEMALE', idNumber: '079095012345', phone: '0912345679', address: 'Q6, TP.HCM' },
  { id: 'p13', patientCode: 'BN013', name: 'Đỗ Minh Phúc', dateOfBirth: '1968-03-22', age: 56, gender: 'MALE', idNumber: '079068013456', phone: '0923456780', address: 'Bình Chánh, TP.HCM', insurance: 'HK3456789' },
  { id: 'p14', patientCode: 'BN014', name: 'Hồ Thị Quỳnh', dateOfBirth: '1982-11-11', age: 42, gender: 'FEMALE', idNumber: '079082014567', phone: '0934567891', address: 'Q8, TP.HCM' },
  { id: 'p15', patientCode: 'BN015', name: 'Phan Văn Sơn', dateOfBirth: '2021-07-04', age: 3, gender: 'MALE', idNumber: '', phone: '0945678902', address: 'Q12, TP.HCM', priorityReason: 'CHILD_UNDER_6', insurance: 'TE6789012' },
  { id: 'p16', patientCode: 'BN016', name: 'Lưu Thị Thảo', dateOfBirth: '1960-09-16', age: 64, gender: 'FEMALE', idNumber: '079060016789', phone: '0956789013', address: 'Hóc Môn, TP.HCM', insurance: 'HU7890123' },
  { id: 'p17', patientCode: 'BN017', name: 'Mai Văn Tuấn', dateOfBirth: '1975-04-28', age: 49, gender: 'MALE', idNumber: '079075017890', phone: '0967890124', address: 'Tân Phú, TP.HCM' },
  { id: 'p18', patientCode: 'BN018', name: 'Cao Thị Uyên', dateOfBirth: '1948-01-03', age: 76, gender: 'FEMALE', idNumber: '079048018901', phone: '0978901235', address: 'Q2, TP.HCM', priorityReason: 'ELDERLY_75PLUS', insurance: 'NC8901234' },
  { id: 'p19', patientCode: 'BN019', name: 'Đinh Quang Vinh', dateOfBirth: '1998-06-21', age: 26, gender: 'MALE', idNumber: '079098019012', phone: '0989012346', address: 'Q9, TP.HCM' },
  { id: 'p20', patientCode: 'BN020', name: 'Trịnh Thị Xuân', dateOfBirth: '1991-12-09', age: 33, gender: 'FEMALE', idNumber: '079091020123', phone: '0990123457', address: 'Nhà Bè, TP.HCM', priorityReason: 'EMERGENCY' },
];

// ===== DOCTORS =====
export const MOCK_DOCTORS: Doctor[] = [
  { id: 'd1', name: 'BS. Phạm Hoài Nam', specialty: 'Nội Tổng Quát', department: 'Nội Tổng Quát', roomId: 'r1', status: 'BUSY', qualifications: 'CKI Nội Khoa' },
  { id: 'd2', name: 'BS. Nguyễn Thu Hương', specialty: 'Tim Mạch', department: 'Tim Mạch', roomId: 'r2', status: 'AVAILABLE', qualifications: 'CKII Tim Mạch' },
  { id: 'd3', name: 'BS. Lê Đức Minh', specialty: 'Nhi Khoa', department: 'Nhi Khoa', roomId: 'r3', status: 'BUSY', qualifications: 'CKI Nhi Khoa' },
  { id: 'd4', name: 'BS. Đặng Hoàng Phú', specialty: 'Nội Tổng Quát', department: 'Nội Tổng Quát', roomId: 'r4', status: 'BUSY', qualifications: 'ThS Nội Khoa' },
  { id: 'd5', name: 'BS. Vũ Thị Lan', specialty: 'Tai Mũi Họng', department: 'Tai Mũi Họng', roomId: 'r5', status: 'AVAILABLE', qualifications: 'CKI TMH' },
  { id: 'd6', name: 'BS. Lý Văn Phong', specialty: 'Da Liễu', department: 'Da Liễu', roomId: 'r6', status: 'BREAK', qualifications: 'CKII Da Liễu' },
  { id: 'd7', name: 'BS. Hồ Thị Nga', specialty: 'Sản Phụ Khoa', department: 'Sản Phụ Khoa', roomId: 'r7', status: 'BUSY', qualifications: 'CKII Sản Phụ Khoa' },
  { id: 'd8', name: 'BS. Bùi Công Thắng', specialty: 'Xương Khớp', department: 'Xương Khớp', roomId: 'r8', status: 'AVAILABLE', qualifications: 'CKI Ngoại Khoa' },
];

// ===== ROOMS =====
export const MOCK_ROOMS: Room[] = [
  { id: 'r1', name: 'Phòng Khám 101', type: 'EXAM', department: 'Nội Tổng Quát', floor: 'Tầng 1', doctorId: 'd1', capacity: 15, currentWaiting: 8, currentServing: 1, avgServiceMinutes: 15, avgWaitMinutes: 42, loadLevel: 'WARNING', status: 'ACTIVE', utilizationRate: 73 },
  { id: 'r2', name: 'Phòng Khám 102', type: 'EXAM', department: 'Tim Mạch', floor: 'Tầng 1', doctorId: 'd2', capacity: 12, currentWaiting: 3, currentServing: 1, avgServiceMinutes: 20, avgWaitMinutes: 18, loadLevel: 'NORMAL', status: 'ACTIVE', utilizationRate: 33 },
  { id: 'r3', name: 'Phòng Khám 103', type: 'EXAM', department: 'Nhi Khoa', floor: 'Tầng 1', doctorId: 'd3', capacity: 15, currentWaiting: 12, currentServing: 1, avgServiceMinutes: 12, avgWaitMinutes: 68, loadLevel: 'OVERLOAD', status: 'ACTIVE', utilizationRate: 87 },
  { id: 'r4', name: 'Phòng Khám 104', type: 'EXAM', department: 'Nội Tổng Quát', floor: 'Tầng 1', doctorId: 'd4', capacity: 15, currentWaiting: 7, currentServing: 1, avgServiceMinutes: 15, avgWaitMinutes: 38, loadLevel: 'WARNING', status: 'ACTIVE', utilizationRate: 60 },
  { id: 'r5', name: 'Phòng Khám 201', type: 'EXAM', department: 'Tai Mũi Họng', floor: 'Tầng 2', doctorId: 'd5', capacity: 10, currentWaiting: 2, currentServing: 0, avgServiceMinutes: 10, avgWaitMinutes: 10, loadLevel: 'NORMAL', status: 'ACTIVE', utilizationRate: 20 },
  { id: 'r6', name: 'Phòng Khám 202', type: 'EXAM', department: 'Da Liễu', floor: 'Tầng 2', doctorId: 'd6', capacity: 10, currentWaiting: 0, currentServing: 0, avgServiceMinutes: 12, avgWaitMinutes: 0, loadLevel: 'NORMAL', status: 'ACTIVE', utilizationRate: 0 },
  { id: 'r7', name: 'Phòng Khám 203', type: 'EXAM', department: 'Sản Phụ Khoa', floor: 'Tầng 2', doctorId: 'd7', capacity: 12, currentWaiting: 9, currentServing: 1, avgServiceMinutes: 20, avgWaitMinutes: 72, loadLevel: 'OVERLOAD', status: 'ACTIVE', utilizationRate: 83 },
  { id: 'r8', name: 'Phòng Khám 204', type: 'EXAM', department: 'Xương Khớp', floor: 'Tầng 2', doctorId: 'd8', capacity: 12, currentWaiting: 4, currentServing: 0, avgServiceMinutes: 18, avgWaitMinutes: 24, loadLevel: 'NORMAL', status: 'ACTIVE', utilizationRate: 33 },
  { id: 'r9', name: 'Phòng Xét Nghiệm', type: 'LAB', department: 'Cận Lâm Sàng', floor: 'Tầng 1', capacity: 20, currentWaiting: 11, currentServing: 3, avgServiceMinutes: 8, avgWaitMinutes: 35, loadLevel: 'WARNING', status: 'ACTIVE', utilizationRate: 70 },
  { id: 'r10', name: 'Phòng XN Huyết Học', type: 'LAB', department: 'Cận Lâm Sàng', floor: 'Tầng 1', capacity: 15, currentWaiting: 5, currentServing: 2, avgServiceMinutes: 10, avgWaitMinutes: 20, loadLevel: 'NORMAL', status: 'ACTIVE', utilizationRate: 47 },
  { id: 'r11', name: 'Phòng Siêu Âm', type: 'IMAGING', department: 'Cận Lâm Sàng', floor: 'Tầng 1', capacity: 8, currentWaiting: 7, currentServing: 1, avgServiceMinutes: 20, avgWaitMinutes: 80, loadLevel: 'OVERLOAD', status: 'ACTIVE', utilizationRate: 100 },
  { id: 'r12', name: 'Phòng X-Quang', type: 'IMAGING', department: 'Cận Lâm Sàng', floor: 'Tầng B1', capacity: 15, currentWaiting: 4, currentServing: 1, avgServiceMinutes: 10, avgWaitMinutes: 25, loadLevel: 'NORMAL', status: 'ACTIVE', utilizationRate: 33 },
  { id: 'r13', name: 'Phòng Điện Tim', type: 'LAB', department: 'Cận Lâm Sàng', floor: 'Tầng 1', capacity: 10, currentWaiting: 2, currentServing: 1, avgServiceMinutes: 15, avgWaitMinutes: 15, loadLevel: 'NORMAL', status: 'ACTIVE', utilizationRate: 30 },
  { id: 'r14', name: 'Phòng CT Scanner', type: 'IMAGING', department: 'Cận Lâm Sàng', floor: 'Tầng B1', capacity: 6, currentWaiting: 5, currentServing: 1, avgServiceMinutes: 25, avgWaitMinutes: 75, loadLevel: 'OVERLOAD', status: 'ACTIVE', utilizationRate: 100 },
  { id: 'r15', name: 'Phòng Khám Tổng Quát VIP', type: 'EXAM', department: 'Nội Tổng Quát', floor: 'Tầng 3', capacity: 6, currentWaiting: 1, currentServing: 1, avgServiceMinutes: 30, avgWaitMinutes: 15, loadLevel: 'NORMAL', status: 'ACTIVE', utilizationRate: 33 },
];

// ===== SERVICES =====
export const MOCK_SERVICES: Service[] = [
  { id: 's1', code: 'KB001', name: 'Khám Nội Tổng Quát', type: 'EXAM', department: 'Nội Tổng Quát', price: 150000, durationMinutes: 15, roomIds: ['r1', 'r4', 'r15'] },
  { id: 's2', code: 'KB002', name: 'Khám Tim Mạch', type: 'EXAM', department: 'Tim Mạch', price: 200000, durationMinutes: 20, roomIds: ['r2'] },
  { id: 's3', code: 'KB003', name: 'Khám Nhi Khoa', type: 'EXAM', department: 'Nhi Khoa', price: 150000, durationMinutes: 12, roomIds: ['r3'] },
  { id: 's4', code: 'KB004', name: 'Khám Tai Mũi Họng', type: 'EXAM', department: 'Tai Mũi Họng', price: 150000, durationMinutes: 10, roomIds: ['r5'] },
  { id: 's5', code: 'KB005', name: 'Khám Da Liễu', type: 'EXAM', department: 'Da Liễu', price: 150000, durationMinutes: 12, roomIds: ['r6'] },
  { id: 's6', code: 'KB006', name: 'Khám Sản Phụ Khoa', type: 'EXAM', department: 'Sản Phụ Khoa', price: 200000, durationMinutes: 20, roomIds: ['r7'] },
  { id: 's7', code: 'KB007', name: 'Khám Xương Khớp', type: 'EXAM', department: 'Xương Khớp', price: 150000, durationMinutes: 18, roomIds: ['r8'] },
  { id: 's8', code: 'XN001', name: 'Xét Nghiệm Máu Tổng Quát', type: 'LAB', department: 'Cận Lâm Sàng', price: 180000, durationMinutes: 8, roomIds: ['r9', 'r10'] },
  { id: 's9', code: 'XN002', name: 'Sinh Hóa Máu', type: 'LAB', department: 'Cận Lâm Sàng', price: 250000, durationMinutes: 10, roomIds: ['r9'] },
  { id: 's10', code: 'XN003', name: 'Tổng Phân Tích Nước Tiểu', type: 'LAB', department: 'Cận Lâm Sàng', price: 100000, durationMinutes: 8, roomIds: ['r9'] },
  { id: 's11', code: 'XN004', name: 'Huyết Học Tổng Quát', type: 'LAB', department: 'Cận Lâm Sàng', price: 120000, durationMinutes: 10, roomIds: ['r10'] },
  { id: 's12', code: 'SA001', name: 'Siêu Âm Ổ Bụng', type: 'IMAGING', department: 'Cận Lâm Sàng', price: 300000, durationMinutes: 20, roomIds: ['r11'] },
  { id: 's13', code: 'SA002', name: 'Siêu Âm Tim', type: 'IMAGING', department: 'Cận Lâm Sàng', price: 350000, durationMinutes: 25, roomIds: ['r11'] },
  { id: 's14', code: 'XQ001', name: 'X-Quang Ngực Thẳng', type: 'IMAGING', department: 'Cận Lâm Sàng', price: 150000, durationMinutes: 10, roomIds: ['r12'] },
  { id: 's15', code: 'XQ002', name: 'X-Quang Cột Sống', type: 'IMAGING', department: 'Cận Lâm Sàng', price: 200000, durationMinutes: 12, roomIds: ['r12'] },
  { id: 's16', code: 'DT001', name: 'Điện Tim 12 Chuyển Đạo', type: 'LAB', department: 'Cận Lâm Sàng', price: 120000, durationMinutes: 15, roomIds: ['r13'] },
  { id: 's17', code: 'CT001', name: 'Chụp CT Đầu', type: 'IMAGING', department: 'Cận Lâm Sàng', price: 900000, durationMinutes: 25, roomIds: ['r14'] },
  { id: 's18', code: 'CT002', name: 'Chụp CT Ngực', type: 'IMAGING', department: 'Cận Lâm Sàng', price: 1200000, durationMinutes: 30, roomIds: ['r14'] },
  { id: 's19', code: 'XN005', name: 'Đông Máu Cơ Bản', type: 'LAB', department: 'Cận Lâm Sàng', price: 150000, durationMinutes: 10, roomIds: ['r10'] },
  { id: 's20', code: 'XN006', name: 'Nhóm Máu ABO+Rh', type: 'LAB', department: 'Cận Lâm Sàng', price: 80000, durationMinutes: 8, roomIds: ['r9', 'r10'] },
];

// ===== VISITS (active today) =====
export const MOCK_VISITS: Visit[] = [
  { id: 'v1', patientId: 'p1', patientName: 'Nguyễn Văn An', ticketNumber: 'A001', visitDate: '2026-05-31', status: 'IN_EXAM', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Đau đầu, chóng mặt', doctorId: 'd1', roomId: 'r1', checkInTime: '07:45:00' },
  { id: 'v2', patientId: 'p2', patientName: 'Trần Thị Bình', ticketNumber: 'P001', visitDate: '2026-05-31', status: 'WAITING_CLS', lane: 'PRIORITY', priorityReason: 'PREGNANT', priorityScore: 90, chiefComplaint: 'Khám thai định kỳ', provisionalDiagnosis: 'Thai 28 tuần', doctorId: 'd7', roomId: 'r7', checkInTime: '07:30:00', clsOrders: ['cls1', 'cls2'] },
  { id: 'v3', patientId: 'p3', patientName: 'Lê Văn Cường', ticketNumber: 'P002', visitDate: '2026-05-31', status: 'WAITING_EXAM', lane: 'PRIORITY', priorityReason: 'ELDERLY_75PLUS', priorityScore: 85, chiefComplaint: 'Tức ngực, khó thở', doctorId: 'd2', roomId: 'r2', checkInTime: '08:00:00' },
  { id: 'v4', patientId: 'p4', patientName: 'Phạm Thị Dung', ticketNumber: 'P003', visitDate: '2026-05-31', status: 'IN_EXAM', lane: 'PRIORITY', priorityReason: 'CHILD_UNDER_6', priorityScore: 95, chiefComplaint: 'Sốt cao, ho', doctorId: 'd3', roomId: 'r3', checkInTime: '07:55:00' },
  { id: 'v5', patientId: 'p5', patientName: 'Hoàng Minh Đức', ticketNumber: 'A002', visitDate: '2026-05-31', status: 'WAITING_EXAM', lane: 'APPOINTMENT', priorityScore: 60, chiefComplaint: 'Khám kiểm tra sức khỏe', doctorId: 'd1', roomId: 'r1', checkInTime: '08:05:00', appointmentId: 'apt1' },
  { id: 'v6', patientId: 'p6', patientName: 'Nguyễn Thị Hoa', ticketNumber: 'P004', visitDate: '2026-05-31', status: 'WAITING_CONCLUSION', lane: 'PRIORITY', priorityReason: 'VETERAN', priorityScore: 88, chiefComplaint: 'Đau khớp gối', provisionalDiagnosis: 'Nghi viêm khớp', doctorId: 'd8', roomId: 'r8', checkInTime: '07:40:00', clsOrders: ['cls3'] },
  { id: 'v7', patientId: 'p7', patientName: 'Vũ Văn Hùng', ticketNumber: 'N001', visitDate: '2026-05-31', status: 'IN_CLS', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Đau bụng vùng thượng vị', provisionalDiagnosis: 'Nghi đau dạ dày', doctorId: 'd1', roomId: 'r1', checkInTime: '08:10:00', clsOrders: ['cls4', 'cls5'] },
  { id: 'v8', patientId: 'p8', patientName: 'Đặng Thị Kim', ticketNumber: 'N002', visitDate: '2026-05-31', status: 'WAITING_EXAM', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Mỏi mắt, nhức đầu', roomId: 'r4', checkInTime: '08:20:00' },
  { id: 'v9', patientId: 'p9', patientName: 'Bùi Quốc Long', ticketNumber: 'N003', visitDate: '2026-05-31', status: 'WAITING_PAYMENT', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Đau họng, sốt nhẹ', finalDiagnosis: 'Viêm họng cấp', conclusion: 'Kê đơn thuốc 5 ngày', doctorId: 'd5', roomId: 'r5', checkInTime: '07:50:00', totalAmount: 270000 },
  { id: 'v10', patientId: 'p10', patientName: 'Lý Thị Mai', ticketNumber: 'P005', visitDate: '2026-05-31', status: 'WAITING_CLS', lane: 'PRIORITY', priorityReason: 'DISABLED', priorityScore: 87, chiefComplaint: 'Đau lưng mãn tính', provisionalDiagnosis: 'Đau thắt lưng', doctorId: 'd8', roomId: 'r8', checkInTime: '08:15:00', clsOrders: ['cls6'] },
  { id: 'v11', patientId: 'p11', patientName: 'Trương Văn Nam', ticketNumber: 'N004', visitDate: '2026-05-31', status: 'WAITING_EXAM', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Ho kéo dài 2 tuần', roomId: 'r1', checkInTime: '08:25:00' },
  { id: 'v12', patientId: 'p12', patientName: 'Võ Thị Oanh', ticketNumber: 'N005', visitDate: '2026-05-31', status: 'WAITING_EXAM', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Nổi mẩn da, ngứa', roomId: 'r6', checkInTime: '08:30:00' },
  { id: 'v13', patientId: 'p13', patientName: 'Đỗ Minh Phúc', ticketNumber: 'A003', visitDate: '2026-05-31', status: 'IN_EXAM', lane: 'APPOINTMENT', priorityScore: 60, chiefComplaint: 'Theo dõi huyết áp', doctorId: 'd4', roomId: 'r4', checkInTime: '08:00:00', appointmentId: 'apt2' },
  { id: 'v14', patientId: 'p14', patientName: 'Hồ Thị Quỳnh', ticketNumber: 'N006', visitDate: '2026-05-31', status: 'WAITING_CLS', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Đau bụng dưới', doctorId: 'd7', roomId: 'r7', checkInTime: '08:35:00', clsOrders: ['cls7'] },
  { id: 'v15', patientId: 'p15', patientName: 'Phan Văn Sơn', ticketNumber: 'P006', visitDate: '2026-05-31', status: 'WAITING_EXAM', lane: 'PRIORITY', priorityReason: 'CHILD_UNDER_6', priorityScore: 95, chiefComplaint: 'Tiêu chảy, nôn ói', roomId: 'r3', checkInTime: '08:40:00' },
  { id: 'v16', patientId: 'p16', patientName: 'Lưu Thị Thảo', ticketNumber: 'N007', visitDate: '2026-05-31', status: 'COMPLETED', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Tái khám sau điều trị', finalDiagnosis: 'Viêm phế quản - khỏi', doctorId: 'd1', roomId: 'r1', checkInTime: '07:00:00', completionTime: '08:15:00', totalAmount: 380000 },
  { id: 'v17', patientId: 'p17', patientName: 'Mai Văn Tuấn', ticketNumber: 'N008', visitDate: '2026-05-31', status: 'WAITING_RESULT', lane: 'AFTER_CLS', priorityScore: 50, chiefComplaint: 'Chóng mặt, buồn nôn', doctorId: 'd2', roomId: 'r2', checkInTime: '08:00:00', clsOrders: ['cls8', 'cls9'] },
  { id: 'v18', patientId: 'p18', patientName: 'Cao Thị Uyên', ticketNumber: 'P007', visitDate: '2026-05-31', status: 'WAITING_EXAM', lane: 'PRIORITY', priorityReason: 'ELDERLY_75PLUS', priorityScore: 85, chiefComplaint: 'Đau đầu gối, đi lại khó', roomId: 'r2', checkInTime: '08:45:00' },
  { id: 'v19', patientId: 'p19', patientName: 'Đinh Quang Vinh', ticketNumber: 'N009', visitDate: '2026-05-31', status: 'WAITING_EXAM', lane: 'NORMAL', priorityScore: 50, chiefComplaint: 'Đau dạ dày', roomId: 'r4', checkInTime: '08:50:00' },
  { id: 'v20', patientId: 'p20', patientName: 'Trịnh Thị Xuân', ticketNumber: 'P008', visitDate: '2026-05-31', status: 'IN_EXAM', lane: 'PRIORITY', priorityReason: 'EMERGENCY', priorityScore: 100, chiefComplaint: 'Đau bụng dữ dội, huyết áp thấp', doctorId: 'd7', roomId: 'r7', checkInTime: '09:00:00' },
];

// ===== QUEUE ITEMS =====
export const MOCK_QUEUE_ITEMS: QueueItem[] = [
  { id: 'q1', visitId: 'v3', patientId: 'p3', patientName: 'Lê Văn Cường', patientAge: 79, patientGender: 'MALE', ticketNumber: 'P002', lane: 'PRIORITY', priorityScore: 85, priorityReason: 'ELDERLY_75PLUS', status: 'WAITING_EXAM', targetRoomId: 'r2', targetDoctorId: 'd2', queuedAt: '08:00:00', estimatedWaitMinutes: 18 },
  { id: 'q2', visitId: 'v5', patientId: 'p5', patientName: 'Hoàng Minh Đức', patientAge: 46, patientGender: 'MALE', ticketNumber: 'A002', lane: 'APPOINTMENT', priorityScore: 60, status: 'WAITING_EXAM', targetRoomId: 'r1', targetDoctorId: 'd1', queuedAt: '08:05:00', estimatedWaitMinutes: 35 },
  { id: 'q3', visitId: 'v8', patientId: 'p8', patientName: 'Đặng Thị Kim', patientAge: 69, patientGender: 'FEMALE', ticketNumber: 'N002', lane: 'NORMAL', priorityScore: 50, status: 'WAITING_EXAM', targetRoomId: 'r4', queuedAt: '08:20:00', estimatedWaitMinutes: 28 },
  { id: 'q4', visitId: 'v11', patientId: 'p11', patientName: 'Trương Văn Nam', patientAge: 52, patientGender: 'MALE', ticketNumber: 'N004', lane: 'NORMAL', priorityScore: 50, status: 'WAITING_EXAM', targetRoomId: 'r1', queuedAt: '08:25:00', estimatedWaitMinutes: 45 },
  { id: 'q5', visitId: 'v12', patientId: 'p12', patientName: 'Võ Thị Oanh', patientAge: 29, patientGender: 'FEMALE', ticketNumber: 'N005', lane: 'NORMAL', priorityScore: 50, status: 'WAITING_EXAM', targetRoomId: 'r6', queuedAt: '08:30:00', estimatedWaitMinutes: 12 },
  { id: 'q6', visitId: 'v15', patientId: 'p15', patientName: 'Phan Văn Sơn', patientAge: 3, patientGender: 'MALE', ticketNumber: 'P006', lane: 'PRIORITY', priorityScore: 95, priorityReason: 'CHILD_UNDER_6', status: 'WAITING_EXAM', targetRoomId: 'r3', queuedAt: '08:40:00', estimatedWaitMinutes: 20 },
  { id: 'q7', visitId: 'v18', patientId: 'p18', patientName: 'Cao Thị Uyên', patientAge: 76, patientGender: 'FEMALE', ticketNumber: 'P007', lane: 'PRIORITY', priorityScore: 85, priorityReason: 'ELDERLY_75PLUS', status: 'WAITING_EXAM', targetRoomId: 'r2', queuedAt: '08:45:00', estimatedWaitMinutes: 22 },
  { id: 'q8', visitId: 'v19', patientId: 'p19', patientName: 'Đinh Quang Vinh', patientAge: 26, patientGender: 'MALE', ticketNumber: 'N009', lane: 'NORMAL', priorityScore: 50, status: 'WAITING_EXAM', targetRoomId: 'r4', queuedAt: '08:50:00', estimatedWaitMinutes: 42 },
  { id: 'q9', visitId: 'v2', patientId: 'p2', patientName: 'Trần Thị Bình', patientAge: 34, patientGender: 'FEMALE', ticketNumber: 'P001', lane: 'PRIORITY', priorityScore: 90, priorityReason: 'PREGNANT', status: 'WAITING_CLS', targetRoomId: 'r11', queuedAt: '08:10:00', estimatedWaitMinutes: 45 },
  { id: 'q10', visitId: 'v10', patientId: 'p10', patientName: 'Lý Thị Mai', patientAge: 36, patientGender: 'FEMALE', ticketNumber: 'P005', lane: 'PRIORITY', priorityScore: 87, priorityReason: 'DISABLED', status: 'WAITING_CLS', targetRoomId: 'r12', queuedAt: '08:30:00', estimatedWaitMinutes: 20 },
  { id: 'q11', visitId: 'v14', patientId: 'p14', patientName: 'Hồ Thị Quỳnh', patientAge: 42, patientGender: 'FEMALE', ticketNumber: 'N006', lane: 'NORMAL', priorityScore: 50, status: 'WAITING_CLS', targetRoomId: 'r11', queuedAt: '08:50:00', estimatedWaitMinutes: 70 },
  { id: 'q12', visitId: 'v17', patientId: 'p17', patientName: 'Mai Văn Tuấn', patientAge: 49, patientGender: 'MALE', ticketNumber: 'N008', lane: 'AFTER_CLS', priorityScore: 55, status: 'WAITING_RESULT', targetRoomId: 'r2', queuedAt: '08:45:00', estimatedWaitMinutes: 30 },
  { id: 'q13', visitId: 'v6', patientId: 'p6', patientName: 'Nguyễn Thị Hoa', patientAge: 59, patientGender: 'FEMALE', ticketNumber: 'P004', lane: 'AFTER_CLS', priorityScore: 88, priorityReason: 'VETERAN', status: 'WAITING_CONCLUSION', targetRoomId: 'r8', queuedAt: '08:30:00', estimatedWaitMinutes: 15 },
];

// ===== CLS ORDERS =====
export const MOCK_CLS_ORDERS: CLSOrder[] = [
  { id: 'cls1', visitId: 'v2', patientId: 'p2', patientName: 'Trần Thị Bình', serviceId: 's12', serviceName: 'Siêu Âm Ổ Bụng', roomId: 'r11', priority: 'ROUTINE', status: 'PENDING', orderedBy: 'd7', orderedAt: '08:05:00', clinicalNote: 'Siêu âm kiểm tra thai nhi 28 tuần' },
  { id: 'cls2', visitId: 'v2', patientId: 'p2', patientName: 'Trần Thị Bình', serviceId: 's8', serviceName: 'Xét Nghiệm Máu Tổng Quát', roomId: 'r9', priority: 'ROUTINE', status: 'COMPLETED', orderedBy: 'd7', orderedAt: '08:05:00', completedAt: '08:40:00', resultId: 'res1' },
  { id: 'cls3', visitId: 'v6', patientId: 'p6', patientName: 'Nguyễn Thị Hoa', serviceId: 's15', serviceName: 'X-Quang Cột Sống', roomId: 'r12', priority: 'ROUTINE', status: 'COMPLETED', orderedBy: 'd8', orderedAt: '07:55:00', completedAt: '08:25:00', resultId: 'res2' },
  { id: 'cls4', visitId: 'v7', patientId: 'p7', patientName: 'Vũ Văn Hùng', serviceId: 's8', serviceName: 'Xét Nghiệm Máu Tổng Quát', roomId: 'r9', priority: 'ROUTINE', status: 'IN_PROGRESS', orderedBy: 'd1', orderedAt: '08:20:00' },
  { id: 'cls5', visitId: 'v7', patientId: 'p7', patientName: 'Vũ Văn Hùng', serviceId: 's12', serviceName: 'Siêu Âm Ổ Bụng', roomId: 'r11', priority: 'ROUTINE', status: 'PENDING', orderedBy: 'd1', orderedAt: '08:20:00' },
  { id: 'cls6', visitId: 'v10', patientId: 'p10', patientName: 'Lý Thị Mai', serviceId: 's15', serviceName: 'X-Quang Cột Sống', roomId: 'r12', priority: 'ROUTINE', status: 'PENDING', orderedBy: 'd8', orderedAt: '08:30:00' },
  { id: 'cls7', visitId: 'v14', patientId: 'p14', patientName: 'Hồ Thị Quỳnh', serviceId: 's12', serviceName: 'Siêu Âm Ổ Bụng', roomId: 'r11', priority: 'URGENT', status: 'ASSIGNED', orderedBy: 'd7', orderedAt: '08:40:00', clinicalNote: 'Đau bụng dưới cần loại trừ viêm ruột thừa' },
  { id: 'cls8', visitId: 'v17', patientId: 'p17', patientName: 'Mai Văn Tuấn', serviceId: 's16', serviceName: 'Điện Tim 12 Chuyển Đạo', roomId: 'r13', priority: 'ROUTINE', status: 'COMPLETED', orderedBy: 'd2', orderedAt: '08:10:00', completedAt: '08:35:00', resultId: 'res3' },
  { id: 'cls9', visitId: 'v17', patientId: 'p17', patientName: 'Mai Văn Tuấn', serviceId: 's8', serviceName: 'Xét Nghiệm Máu Tổng Quát', roomId: 'r9', priority: 'ROUTINE', status: 'COMPLETED', orderedBy: 'd2', orderedAt: '08:10:00', completedAt: '08:40:00', resultId: 'res4' },
];

// ===== CLS RESULTS =====
export const MOCK_CLS_RESULTS: CLSResult[] = [
  { id: 'res1', orderId: 'cls2', visitId: 'v2', result: 'Huyết đồ: BC 8.5 K/uL, HC 3.8 M/uL, Hb 11.2 g/dL, Hct 33.5%, TC 185 K/uL. Nhận xét: Thiếu máu nhẹ do thiếu sắt', isAbnormal: true, performedBy: 'ktvxn', performedAt: '08:40:00', note: 'Cần bổ sung sắt theo chỉ định bác sĩ' },
  { id: 'res2', orderId: 'cls3', visitId: 'v6', result: 'X-Quang cột sống thắt lưng thẳng nghiêng: Hẹp khe liên đốt L4-L5, L5-S1. Mỏ xương nhỏ ở bờ trước thân đốt sống. Kết luận: Thoái hóa cột sống thắt lưng độ II', isAbnormal: true, performedBy: 'u7', performedAt: '08:25:00' },
  { id: 'res3', orderId: 'cls8', visitId: 'v17', result: 'Điện tim bình thường. Nhịp xoang đều, tần số 78 l/p. Trục điện tim bình thường. Không có ST chênh, không rối loạn nhịp', isAbnormal: false, performedBy: 'u7', performedAt: '08:35:00' },
  { id: 'res4', orderId: 'cls9', visitId: 'v17', result: 'Công thức máu trong giới hạn bình thường. BC 7.2, HC 4.5, Hb 14.3, TC 220. Lưu ý: Cholesterol toàn phần 5.8 mmol/L (cao giới hạn)', isAbnormal: false, performedBy: 'u7', performedAt: '08:40:00' },
];

// ===== APPOINTMENTS =====
export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'apt1', patientId: 'p5', patientName: 'Hoàng Minh Đức', doctorId: 'd1', roomId: 'r1', serviceId: 's1', scheduledDate: '2026-05-31', scheduledTime: '08:00', status: 'CHECKED_IN' },
  { id: 'apt2', patientId: 'p13', patientName: 'Đỗ Minh Phúc', doctorId: 'd4', roomId: 'r4', serviceId: 's1', scheduledDate: '2026-05-31', scheduledTime: '08:00', status: 'CHECKED_IN' },
  { id: 'apt3', patientId: 'p16', patientName: 'Lưu Thị Thảo', doctorId: 'd1', roomId: 'r1', serviceId: 's1', scheduledDate: '2026-05-31', scheduledTime: '07:00', status: 'CHECKED_IN' },
  { id: 'apt4', patientId: 'p9', patientName: 'Bùi Quốc Long', doctorId: 'd5', roomId: 'r5', serviceId: 's4', scheduledDate: '2026-05-31', scheduledTime: '07:30', status: 'CHECKED_IN' },
  { id: 'apt5', patientId: 'p11', patientName: 'Trương Văn Nam', doctorId: 'd1', roomId: 'r1', serviceId: 's1', scheduledDate: '2026-05-31', scheduledTime: '09:00', status: 'SCHEDULED' },
  { id: 'apt6', patientId: 'p17', patientName: 'Mai Văn Tuấn', doctorId: 'd2', roomId: 'r2', serviceId: 's2', scheduledDate: '2026-05-31', scheduledTime: '08:00', status: 'CHECKED_IN' },
];

// ===== STATUS HISTORY =====
export const MOCK_STATUS_HISTORY: StatusHistoryEntry[] = [
  { id: 'sh1', visitId: 'v1', toStatus: 'WAITING_EXAM', timestamp: '07:45:00', performedBy: 'u2', performedByName: 'Trần Thị Lễ Tân' },
  { id: 'sh2', visitId: 'v1', fromStatus: 'WAITING_EXAM', toStatus: 'IN_EXAM', timestamp: '08:30:00', performedBy: 'u4', performedByName: 'BS. Phạm Hoài Nam' },
  { id: 'sh3', visitId: 'v2', toStatus: 'WAITING_EXAM', timestamp: '07:30:00', performedBy: 'u2', performedByName: 'Trần Thị Lễ Tân' },
  { id: 'sh4', visitId: 'v2', fromStatus: 'WAITING_EXAM', toStatus: 'IN_EXAM', timestamp: '08:00:00', performedBy: 'u7', performedByName: 'BS. Hồ Thị Nga' },
  { id: 'sh5', visitId: 'v2', fromStatus: 'IN_EXAM', toStatus: 'WAITING_CLS', timestamp: '08:10:00', performedBy: 'u7', performedByName: 'BS. Hồ Thị Nga' },
  { id: 'sh6', visitId: 'v16', toStatus: 'WAITING_EXAM', timestamp: '07:00:00', performedBy: 'u2', performedByName: 'Trần Thị Lễ Tân' },
  { id: 'sh7', visitId: 'v16', fromStatus: 'WAITING_EXAM', toStatus: 'IN_EXAM', timestamp: '07:15:00', performedBy: 'u4', performedByName: 'BS. Phạm Hoài Nam' },
  { id: 'sh8', visitId: 'v16', fromStatus: 'IN_EXAM', toStatus: 'WAITING_PAYMENT', timestamp: '07:55:00', performedBy: 'u4', performedByName: 'BS. Phạm Hoài Nam' },
  { id: 'sh9', visitId: 'v16', fromStatus: 'WAITING_PAYMENT', toStatus: 'COMPLETED', timestamp: '08:15:00', performedBy: 'u2', performedByName: 'Trần Thị Lễ Tân' },
  { id: 'sh10', visitId: 'v9', toStatus: 'WAITING_EXAM', timestamp: '07:50:00', performedBy: 'u2', performedByName: 'Trần Thị Lễ Tân' },
  { id: 'sh11', visitId: 'v9', fromStatus: 'WAITING_EXAM', toStatus: 'IN_EXAM', timestamp: '08:10:00', performedBy: 'u5', performedByName: 'BS. Vũ Thị Lan' },
  { id: 'sh12', visitId: 'v9', fromStatus: 'IN_EXAM', toStatus: 'WAITING_PAYMENT', timestamp: '08:45:00', performedBy: 'u5', performedByName: 'BS. Vũ Thị Lan' },
];

// ===== DISPATCH HISTORY =====
export const MOCK_DISPATCH_HISTORY: DispatchHistoryEntry[] = [
  { id: 'dh1', visitId: 'v2', patientId: 'p2', patientName: 'Trần Thị Bình', fromRoomId: 'r7', toRoomId: 'r11', toRoomName: 'Phòng Siêu Âm', followedSuggestion: true, reason: 'Chỉ định siêu âm thai', dispatchedBy: 'u3', dispatchedByName: 'Lê Văn Điều Phối', dispatchedAt: '08:10:00' },
  { id: 'dh2', visitId: 'v6', patientId: 'p6', patientName: 'Nguyễn Thị Hoa', fromRoomId: 'r8', toRoomId: 'r12', toRoomName: 'Phòng X-Quang', followedSuggestion: true, reason: 'Chỉ định X-Quang cột sống', dispatchedBy: 'u3', dispatchedByName: 'Lê Văn Điều Phối', dispatchedAt: '07:55:00' },
  { id: 'dh3', visitId: 'v7', patientId: 'p7', patientName: 'Vũ Văn Hùng', fromRoomId: 'r1', toRoomId: 'r9', toRoomName: 'Phòng Xét Nghiệm', followedSuggestion: false, reason: 'Chỉ định XN máu, chuyển tay vì BN muốn XN nhanh', dispatchedBy: 'u3', dispatchedByName: 'Lê Văn Điều Phối', dispatchedAt: '08:20:00' },
  { id: 'dh4', visitId: 'v9', patientId: 'p9', patientName: 'Bùi Quốc Long', fromRoomId: undefined, toRoomId: 'r5', toRoomName: 'Phòng Khám 201', followedSuggestion: true, reason: 'BN đặt lịch khám TMH', dispatchedBy: 'u2', dispatchedByName: 'Trần Thị Lễ Tân', dispatchedAt: '07:50:00' },
];

// ===== INVOICES =====
export const MOCK_INVOICES: Invoice[] = [
  { id: 'inv1', visitId: 'v9', patientId: 'p9', patientName: 'Bùi Quốc Long', items: [{ serviceId: 's4', serviceName: 'Khám Tai Mũi Họng', quantity: 1, unitPrice: 150000, totalPrice: 150000 }, { serviceId: 's8', serviceName: 'Xét Nghiệm Máu', quantity: 1, unitPrice: 180000, totalPrice: 180000 }], totalAmount: 330000, paidAmount: 0, status: 'PENDING', createdAt: '08:45:00' },
  { id: 'inv2', visitId: 'v16', patientId: 'p16', patientName: 'Lưu Thị Thảo', items: [{ serviceId: 's1', serviceName: 'Khám Nội Tổng Quát', quantity: 1, unitPrice: 150000, totalPrice: 150000 }, { serviceId: 's14', serviceName: 'X-Quang Ngực', quantity: 1, unitPrice: 150000, totalPrice: 150000 }], totalAmount: 300000, paidAmount: 300000, status: 'PAID', createdAt: '07:55:00', paidAt: '08:15:00' },
];

// ===== ROOM SNAPSHOTS (hourly) =====
export const MOCK_ROOM_SNAPSHOTS: RoomSnapshot[] = [
  { id: 'rs1', roomId: 'r1', roomName: 'Phòng Khám 101', timestamp: '07:00', waitingCount: 2, servingCount: 1, loadLevel: 'NORMAL', avgWaitMinutes: 12 },
  { id: 'rs2', roomId: 'r1', roomName: 'Phòng Khám 101', timestamp: '08:00', waitingCount: 6, servingCount: 1, loadLevel: 'WARNING', avgWaitMinutes: 38 },
  { id: 'rs3', roomId: 'r1', roomName: 'Phòng Khám 101', timestamp: '09:00', waitingCount: 8, servingCount: 1, loadLevel: 'WARNING', avgWaitMinutes: 45 },
  { id: 'rs4', roomId: 'r3', roomName: 'Phòng Khám 103', timestamp: '07:00', waitingCount: 3, servingCount: 1, loadLevel: 'NORMAL', avgWaitMinutes: 18 },
  { id: 'rs5', roomId: 'r3', roomName: 'Phòng Khám 103', timestamp: '08:00', waitingCount: 8, servingCount: 1, loadLevel: 'WARNING', avgWaitMinutes: 52 },
  { id: 'rs6', roomId: 'r3', roomName: 'Phòng Khám 103', timestamp: '09:00', waitingCount: 12, servingCount: 1, loadLevel: 'OVERLOAD', avgWaitMinutes: 68 },
  { id: 'rs7', roomId: 'r11', roomName: 'Phòng Siêu Âm', timestamp: '07:00', waitingCount: 2, servingCount: 1, loadLevel: 'NORMAL', avgWaitMinutes: 25 },
  { id: 'rs8', roomId: 'r11', roomName: 'Phòng Siêu Âm', timestamp: '08:00', waitingCount: 5, servingCount: 1, loadLevel: 'WARNING', avgWaitMinutes: 55 },
  { id: 'rs9', roomId: 'r11', roomName: 'Phòng Siêu Âm', timestamp: '09:00', waitingCount: 7, servingCount: 1, loadLevel: 'OVERLOAD', avgWaitMinutes: 80 },
];

// ===== DASHBOARD STATS =====
export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalPatientsToday: 47,
  waitingExam: 8,
  waitingCLS: 5,
  waitingConclusion: 2,
  avgWaitMinutes: 34,
  overloadedRooms: 4,
  roomUtilizationRate: 68,
  dispatchCount: 18,
  completedToday: 12,
  cancelledToday: 1,
};

// ===== CHART DATA =====
export const PATIENT_FLOW_CHART_DATA = [
  { time: '07:00', check_in: 8, completed: 2, waiting: 6 },
  { time: '07:30', check_in: 12, completed: 5, waiting: 9 },
  { time: '08:00', check_in: 18, completed: 8, waiting: 12 },
  { time: '08:30', check_in: 28, completed: 11, waiting: 16 },
  { time: '09:00', check_in: 35, completed: 13, waiting: 20 },
  { time: '09:30', check_in: 42, completed: 18, waiting: 22 },
  { time: '10:00', check_in: 47, completed: 22, waiting: 19 },
];

export const WAIT_TIME_CHART_DATA = [
  { date: '27/05', avg_wait: 28, avg_service: 16 },
  { date: '28/05', avg_wait: 32, avg_service: 15 },
  { date: '29/05', avg_wait: 25, avg_service: 14 },
  { date: '30/05', avg_wait: 38, avg_service: 17 },
  { date: '31/05', avg_wait: 34, avg_service: 15 },
];

export const DEPARTMENT_STATS = [
  { dept: 'Nội TQ', patients: 18, avgWait: 42 },
  { dept: 'Tim Mạch', patients: 8, avgWait: 20 },
  { dept: 'Nhi Khoa', patients: 14, avgWait: 65 },
  { dept: 'SPK', patients: 10, avgWait: 58 },
  { dept: 'CLS', patients: 32, avgWait: 35 },
  { dept: 'TMH', patients: 6, avgWait: 15 },
  { dept: 'Da Liễu', patients: 4, avgWait: 12 },
  { dept: 'Xương Khớp', patients: 7, avgWait: 24 },
];
