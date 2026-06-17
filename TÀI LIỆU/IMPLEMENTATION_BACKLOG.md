# 1. Tổng quan mục tiêu triển khai

Nguồn sự thật: `TÀI LIỆU/ĐỒ ÁN.md`. Backlog này đối chiếu tài liệu với source hiện tại tại thời điểm rà soát, tập trung vào khoảng cách triển khai để đưa hệ thống tới luồng khám ngoại trú end-to-end.

## Vai trò người dùng

Hệ thống cần hỗ trợ các vai trò: Admin, Doctor, Nurse/Điều phối, Receptionist, nhân viên CLS, quản lý/giám sát và khách hàng/bệnh nhân. Source hiện tại có phân vai frontend dạng demo trong `AuthContext` với `ADMIN`, `RECEPTIONIST`, `COORDINATOR`, `DOCTOR`, `LAB_STAFF`, `MANAGER`, nhưng chưa có auth backend thật, chưa có token/session server-side, chưa có API quản lý tài khoản, khóa/mở khóa và audit đăng nhập.

## Luồng bệnh nhân

Luồng mục tiêu: đặt lịch hoặc tiếp nhận tại quầy -> check-in -> tạo Visit -> cấp số thứ tự -> đưa vào Queue -> điều phối phòng -> bác sĩ gọi và bắt đầu khám -> có thể chỉ định CLS -> phòng CLS thực hiện và trả kết quả -> quay lại bác sĩ kết luận -> thanh toán -> hoàn tất. Source hiện tại đã có một số API đọc dữ liệu, đặt lịch, turn start/complete, CLS start/complete và dispatch decision, nhưng thiếu check-in thật, tạo visit/queue item từ reception, payment API/UI và nhiều state transition nghiệp vụ.

## State model

Tài liệu yêu cầu các trạng thái lượt khám: chờ khám, đang khám, chờ CLS, đang CLS, chờ kết quả, chờ kết luận, chờ thanh toán, hoàn tất, hủy. Database hiện có `VisitProgress`, `VisitStateHistory`, `VisitClinical`, `QueueItemStatus`, `TurnProgress`, nhưng API mutation cho mọi chuyển trạng thái chưa đủ. Frontend hiển thị badge/timeline ở một số màn hình, nhưng chưa có workflow chuyển trạng thái hoàn chỉnh.

## Queue đa làn

Tài liệu yêu cầu các làn: đặt lịch, sau CLS, ưu tiên, thường; queue type: khám, CLS, kết luận; lưu thời điểm enqueue/call/start/dequeue; timeout; giải thích điểm ưu tiên. Source hiện có `QueueItem`, `QueueItemStatus`, `QueueItemHistory`, helper priority score và `GET /api/queue`, nhưng thiếu API action đầy đủ cho call/start/timeout/cancel/enqueue từ các luồng nghiệp vụ.

## Dispatch/gợi ý phòng

Tài liệu yêu cầu lọc phòng phù hợp, xếp hạng tài nguyên, top gợi ý, xác nhận thủ công, lưu quyết định điều phối và chuyển phòng bệnh nhân đang chờ. Source hiện có `GET /api/dispatch/suggestions`, `POST /api/dispatch/decisions`, `DispatchDecision` và `DispatchPage`, nhưng accept/reject/manual dispatch chưa đủ chặt, chưa có fallback thủ công rõ ràng khi gợi ý lỗi.

## CLS

Tài liệu yêu cầu bác sĩ tạo chỉ định CLS, hệ thống đưa vào hàng đợi CLS, nhân viên CLS thực hiện, nhập kết quả, đánh dấu bất thường, sau đó bệnh nhân quay lại làn sau CLS. Source hiện có `CLSOrder`, `CLSResult`, `GET/PATCH /api/cls/orders`, `GET /api/cls/results`, `LabPage`, nhưng chưa có API tạo CLS order từ doctor theo luồng thật và chưa đóng kín trạng thái quay lại bác sĩ.

## Thanh toán

Tài liệu yêu cầu hóa đơn, chi tiết hóa đơn, trạng thái thanh toán và phương thức thanh toán. Database có `Invoice`, `InvoiceItem`, nhưng backend không có route/module payment/invoice và frontend không có màn hình thanh toán vận hành. Đây là blocker end-to-end.

## Monitoring

Tài liệu yêu cầu tải phòng, wait time, utilization, NORMAL/WARNING/OVERLOAD, snapshot, demand smoothing và gợi ý tái phân bổ. Source hiện có `MonitoringPage` tính toán từ rooms/queue/visits/doctors, `ResourceLoad`, `QueueSnapshot`, dispatch scoring test, nhưng thiếu API snapshot/monitoring riêng, job định kỳ, cảnh báo vận hành và xác nhận tái phân bổ.

## Báo cáo

Tài liệu yêu cầu báo cáo theo quyền, lọc, thống kê bệnh nhân/thời gian chờ/queue/quá tải/tỷ lệ làm theo gợi ý và export. Source hiện có `ReportsPage` tổng hợp từ các API hiện có, nhưng chưa có report API chuyên biệt, chưa có export thật và chưa có phân quyền backend.

# 2. Requirements Traceability Matrix

| Requirement ID | Tên yêu cầu | Use Case liên quan | Actor | Backend hiện trạng | Frontend hiện trạng | API hiện trạng | Database hiện trạng | Status | Priority | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|
| FR-01 | Đăng nhập | UC01 | Tất cả | Chưa có auth service | Demo `sessionStorage` | Thiếu `/auth/login`, `/auth/me`, `/auth/logout` | Có `User`, password hash field | FAIL | P0 | Không thể coi là auth thật |
| FR-02 | Kiểm tra trạng thái tài khoản | UC01 | Tất cả | Chưa enforce | Không hiển thị locked/inactive | Thiếu | `User.isActive` có | FAIL | P0 | Cần chặn login từ backend |
| FR-03 | Phân quyền theo vai trò | UC01 | Admin | Chưa có middleware role | Có route guard demo | Thiếu backend guard | `User.role` có | PARTIAL | P0 | `/visit-tracking` còn public |
| FR-04 | Admin quản lý tài khoản | UC01 | Admin | Chưa có user CRUD | Chưa có màn hình quản trị | Thiếu `/users` | `User` có | FAIL | P0 | Cần create/update/lock/unlock |
| FR-05 | Ghi nhận last login/audit | UC01 | Admin | Chưa có audit API | Chưa có màn hình log | Thiếu | `lastLogin` có, audit log chưa rõ | FAIL | P1 | Cần log thao tác quan trọng |
| FR-06..10 | Danh mục khoa/phòng/dịch vụ | UC05, Admin nền | Admin | Có list service | Chỉ xem/tổng hợp | Có `GET /departments`, `/rooms`, `/services` | Có Department, Room, ServiceCatalog | PARTIAL | P1 | Thiếu CRUD và quản trị trạng thái |
| FR-11..14 | Bác sĩ và lịch làm việc | UC05 | Admin, Receptionist, Doctor | Có list doctor kèm schedules | Có màn hình xem lịch | Có `GET /doctors` | Có DoctorProfile, schedule relation | PARTIAL | P1 | Thiếu CRUD schedule và filter ngày/tuần/tháng đầy đủ |
| FR-15 | Tạo lịch hẹn | UC02 | Receptionist/Admin | Có create appointment | Có form đặt lịch | Có `POST /appointments` | Có Appointment | PARTIAL | P0 | Tạo được lịch, nhưng chưa thành check-in/visit/queue |
| FR-16..17 | Trạng thái lịch hẹn, đến muộn | UC02 | Receptionist | Chưa đủ mutation | UI chưa có check-in/late/no-show/cancel | Thiếu appointment status API | Appointment.status có | FAIL | P0 | Blocker cho reception end-to-end |
| FR-18..21 | Hồ sơ bệnh nhân và ưu tiên | UC03, UC02 | Receptionist | Patient chỉ list; appointment service tự resolve/create | Reception form có một phần | `GET /patients`, `POST /appointments` gián tiếp | Patient có priority stable fields | PARTIAL | P0 | Thiếu patient create/update API riêng và validation trùng dữ liệu rõ |
| FR-22..23 | Tạo visit, cấp số thứ tự | UC4.1 | Receptionist | Có read visit, chưa có create/check-in route | Chưa có action check-in tạo visit thật | Thiếu `POST /visits`, `POST /check-in` | Visit, queueNumber có | FAIL | P0 | Blocker lớn nhất sau auth |
| FR-24..27 | State visit và history | UC4.1 | Tất cả | Có model/read, một số mutation qua turn/cls | Timeline/list có | `GET /visits`, turn/cls patch | VisitProgress, VisitStateHistory | PARTIAL | P0 | Thiếu transition API thống nhất và cancel visit |
| FR-28..34 | Queue đa làn/priority/timeout | UC4.2 | System, Receptionist | Có list/detail và scoring | Queue page chủ yếu read-only | `GET /queue` | QueueItem, QueueItemStatus, QueueItemHistory | PARTIAL | P0/P1 | Thiếu enqueue/call/start/timeout/cancel API cho vận hành |
| FR-35..40 | Dispatch/gợi ý phòng | UC4.2 | Coordinator, Receptionist | Có suggestion/decision | Dispatch page có chọn và lưu | `GET /dispatch/suggestions`, `POST /dispatch/decisions` | DispatchDecision, ResourceLoad | PARTIAL | P1 | Thiếu accept/reject/manual/fallback rõ và chuyển phòng an toàn |
| FR-41..45 | Khám lâm sàng | UC4.1, UC4.2 | Doctor | Có turn start/complete | Doctor page có hàng đợi và action cơ bản | `GET/PATCH /turns` | Turn, TurnProgress, VisitClinical | PARTIAL | P0 | Thiếu ghi lý do khám/chẩn đoán/chỉ định CLS qua API thật |
| FR-46..51 | Chỉ định và trả kết quả CLS | UC4.3 | Doctor, Lab Staff | Có start/complete order, result | Lab page có start/complete/result | `GET/PATCH /cls/orders`, `GET /cls/results` | CLSOrder, CLSResult | PARTIAL | P0/P1 | Thiếu API tạo chỉ định CLS và quay lại after-CLS lane |
| FR-52..55 | Kết luận khám | UC4.1 | Doctor | Có clinical fields, chưa có endpoint kết luận rõ | Doctor legacy có form, routed page chưa đóng kín | Thiếu conclusion endpoint riêng | VisitClinical có | PARTIAL | P0/P1 | Cần conclusion API chuyển WAITING_PAYMENT/COMPLETED |
| FR-56..59 | Thanh toán | Payment | Receptionist/Cashier | Chưa có module route | Chưa có màn hình | Thiếu `/invoices`, `/payments` | Invoice, InvoiceItem có | FAIL | P0/P1 | Blocker để hoàn tất journey |
| FR-60..64 | Monitoring tải và snapshot | Monitoring | System, Manager | Có dashboard overview; chưa có monitoring/snapshot service | Monitoring page tính client-side | `GET /dashboard/overview`, `/rooms`, `/queue` | ResourceLoad, QueueSnapshot có | PARTIAL | P2 | Thiếu job định kỳ và API snapshot |
| FR-65..71 | Demand smoothing | Monitoring | System, Coordinator | Có scoring/test một phần | UI chưa có tái phân bổ đầy đủ | Thiếu API smoothing/reallocation | ResourceLoad, QueueSnapshot, DispatchDecision | PARTIAL | P2 | Cần accept/reject reallocation |
| FR-72..79 | Báo cáo/thống kê/export | UC06 | Admin, Manager, Doctor | Có overview và list APIs | Reports page tổng hợp | Thiếu report/export API chuyên biệt | Dữ liệu nguồn có một phần | PARTIAL | P2 | Nút export chưa có handler/API |
| FR-80..84 | Audit, quyền, ngoại lệ, fallback | Cross-cutting | System | Có error middleware, thiếu audit/fallback | Có PageState, thiếu trang lỗi nghiệp vụ | Thiếu audit/fallback APIs | Chưa có audit log entity rõ | FAIL | P1 | Cần log thao tác và manual fallback |

# 3. End-to-end Journey Audit

| Step | Screen | Route | API | Service | Database Entity | State trước | State sau | Status | Blocker | Cách sửa |
|---|---|---|---|---|---|---|---|---|---|---|
| Đặt lịch | Customer booking, Reception appointments | `/appointment`, `/reception?view=appointments` | `POST /api/appointments` | `createAppointmentBooking` | Patient, Appointment | Chưa có lịch | `Appointment.SCHEDULED` | PARTIAL | Chưa nối check-in/visit/queue | Sau create appointment cần flow reception xác nhận/check-in |
| Check-in | Reception | `/reception` | Thiếu | Thiếu | Appointment, Visit | `SCHEDULED/CONFIRMED` | `CHECKED_IN` | FAIL | Không có appointment status API | Thêm `PATCH /appointments/:id/check-in` |
| Tạo Visit | Reception | `/reception` | Thiếu | Thiếu | Visit, VisitProgress | Appointment checked-in hoặc walk-in | `WAITING_EXAM` | FAIL | Không có `POST /visits`/check-in transaction | Tạo transaction patient/appointment/visit/progress/history |
| Queue | Queue, Reception | `/queue`, `/reception?view=queue` | Chỉ `GET /api/queue` | `getQueueItems` | QueueItem, QueueItemStatus | Visit vừa tạo | Enqueued `WAITING` | PARTIAL | Thiếu enqueue action | Thêm enqueue trong check-in và API queue action |
| Dispatch | Dispatch | `/dispatch` | `GET /dispatch/suggestions`, `POST /dispatch/decisions` | dispatch service | DispatchDecision, ResourceLoad | Queue waiting | Assignment/decision saved | PARTIAL | Chưa có accept/reject/manual đầy đủ | Chuẩn hóa decision types, apply assignment/current queue target |
| Doctor Exam | Doctor | `/doctor?view=queue` | `PATCH /turns/:id/start`, `PATCH /turns/:id/complete` | turn service | Turn, TurnProgress, VisitProgress | `WAITING_EXAM` | `IN_EXAM` hoặc next state | PARTIAL | Thiếu call next và clinical form API | Thêm `call`, `start`, `save-clinical-note`, `complete-exam` |
| CLS order | Doctor | `/doctor` | Thiếu create CLS order | Thiếu route | CLSOrder, QueueItem | `IN_EXAM` | `WAITING_CLS` | FAIL | Không có `POST /cls/orders` | Tạo order + CLS queue item + visit history |
| Lab workflow | Lab | `/lab` | `PATCH /cls/orders/:id/start/complete` | cls service | CLSOrder, CLSResult, VisitProgress | `WAITING_CLS` | `IN_CLS` -> `WAITING_RESULT` | PARTIAL | Chỉ xử lý order có sẵn | Hoàn thiện transition và validate status |
| Result | Lab, Doctor results | `/lab`, `/doctor?view=results` | `GET /cls/results`, complete order payload | cls service | CLSResult | `WAITING_RESULT` | Result saved | PARTIAL | Chưa có explicit read/acknowledge by doctor | Thêm acknowledge/read result nếu cần nghiệp vụ |
| Conclusion | Doctor | `/doctor` | Thiếu conclusion endpoint riêng | Thiếu route rõ | VisitClinical, VisitProgress | `WAITING_CONCLUSION` | `WAITING_PAYMENT` hoặc `COMPLETED` | PARTIAL | Form conclusion chưa nối API routed page đầy đủ | Thêm `PATCH /visits/:id/conclusion` |
| Payment | Payment/Reception | Chưa có | Thiếu | Thiếu | Invoice, InvoiceItem | `WAITING_PAYMENT` | `PAID/COMPLETED` | FAIL | Không có invoice/payment route/UI | Thêm invoice/payment module và màn hình thu ngân/lễ tân |
| Completed | Visit tracking, Reports | `/visit-tracking`, `/reports` | `GET /visits` | visit service | VisitProgress, VisitClinical, Invoice | Paid hoặc no-payment | `COMPLETED` | PARTIAL | Completed phụ thuộc payment/conclusion chưa đủ | Chốt state transition sau payment và cập nhật reports |

# 4. Phase Plan

## Phase 1 - P0: Nền tảng sống còn

- Auth thật: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, password hash, active/locked account.
- Role/route guard: middleware backend theo role, frontend route guard đọc user thật từ `/auth/me`, bảo vệ mọi route nội bộ.
- Reception check-in: xem appointment, check-in appointment, xử lý walk-in.
- Tạo visit: transaction tạo/cập nhật patient, visit, progress, state history.
- Tạo queue item: enqueue vào lane đúng, sinh số thứ tự, lưu priority score và history.
- State transition/history: API chung cho transition hợp lệ, lưu actor/time/duration.
- Doctor gọi khám: call next, start serving, timeout/no-show.
- Luồng khám cơ bản: bác sĩ bắt đầu khám, ghi clinical note, hoàn tất khám không CLS.

## Phase 2 - P0/P1: End-to-end khám bệnh hoàn chỉnh

- Chỉ định CLS: `POST /cls/orders` từ visit đang khám, chọn service/priority/note.
- Lab workflow: list orders, start, complete, validate status.
- Trả kết quả: lưu result text/file url/isAbnormal/resultBy.
- Quay lại bác sĩ: sau tất cả CLS completed, chuyển lane `AFTER_CLS`, state `WAITING_CONCLUSION`.
- Kết luận: bác sĩ xem full visit, results, cập nhật final diagnosis/conclusion/treatment plan.
- Thanh toán: tạo invoice từ dịch vụ phát sinh, cập nhật payment status/method.
- Completed: sau thanh toán hoặc no-payment, chuyển `COMPLETED`, lưu completedAt.

## Phase 3 - P1: Queue và Dispatch nâng cao

- Queue đa làn: appointment, after-CLS, priority, normal; sort server-side theo lane/score/time.
- Priority score: lưu thành phần điểm để giải thích.
- Call/start/timeout/cancel: API và nút UI cho queue/doctor/reception.
- Dispatch suggestion: top candidates, reason, resource score, wait estimate.
- Accept/reject/manual dispatch: lưu lý do không theo gợi ý và áp dụng assignment.
- Dispatch decision history: màn hình xem lịch sử, tỷ lệ làm theo gợi ý.

## Phase 4 - P1/P2: Admin và dữ liệu nền

- Quản lý tài khoản: create/update/lock/unlock, role, department scope, last login.
- Khoa/phòng: CRUD department/room, active status, capacity, avg service time.
- Dịch vụ: CRUD service, room mapping, target wait, avg duration, urgent CLS flag.
- Bác sĩ: profile, license, specialty, default room, active status.
- Lịch làm việc: CRUD schedule, detect overlap, max patients.
- Lịch hẹn nâng cao: update/reschedule/cancel/no-show/late and issue new queue number.

## Phase 5 - P2: Monitoring, báo cáo, UI polish

- Monitoring tải phòng: resource load API, realtime-ish refresh, alert level.
- Điểm nghẽn: wait time, utilization, queue pressure, room overload.
- Demand smoothing: periodic snapshot, warning trend, reallocation suggestion.
- Báo cáo: report APIs theo role, filters by date/department/room/doctor/service/status.
- Export nếu khả thi: CSV/Excel/PDF cho report chính.
- UI/UX polish: bỏ legacy mock context khỏi luồng chính, thống nhất tiếng Việt, loading/error/empty/validation rõ.

# 5. Definition of Done

## Phase 1 DoD

- Chức năng đạt: user đăng nhập bằng backend thật; route nội bộ không truy cập được nếu chưa auth; reception có thể check-in hoặc tạo lượt khám walk-in; visit được tạo với progress/history; queue item được sinh; doctor gọi và bắt đầu khám được.
- API phải hoạt động: `/auth/login`, `/auth/me`, `/auth/logout`, `/appointments/:id/check-in`, `/visits`, `/queue/actions`, `/turns/:id/start`, `/turns/:id/complete`.
- Màn hình phải hoạt động: Login, Reception intake/check-in, Queue, Doctor queue, Visit tracking.
- Test thủ công: đăng nhập từng role; tạo/check-in bệnh nhân; thấy số thứ tự trong queue; bác sĩ start/complete; xem timeline có history.

## Phase 2 DoD

- Chức năng đạt: bác sĩ chỉ định CLS; lab nhận và hoàn tất; kết quả quay lại bác sĩ; bác sĩ kết luận; lễ tân/thu ngân thanh toán; visit completed.
- API phải hoạt động: `POST /cls/orders`, `/cls/orders/:id/start`, `/cls/orders/:id/complete`, `/visits/:id/conclusion`, `/invoices`, `/payments`.
- Màn hình phải hoạt động: Doctor exam, Lab orders/results, Doctor results/conclusion, Payment, Visit tracking.
- Test thủ công: chạy một bệnh nhân từ `WAITING_EXAM` qua CLS tới `COMPLETED`, kiểm tra state/history/invoice.

## Phase 3 DoD

- Chức năng đạt: queue sort đúng lane/score/time; timeout/no-show/cancel rõ; dispatch gợi ý top phòng; người dùng accept/reject/manual và history lưu đủ.
- API phải hoạt động: queue mutation APIs, dispatch suggestion/detail/decision APIs, transfer waiting patient API.
- Màn hình phải hoạt động: Queue operations, Dispatch operations, Monitoring basic alerts.
- Test thủ công: tạo bệnh nhân ưu tiên, đặt lịch, sau CLS; xác nhận thứ tự queue; reject gợi ý có ghi lý do; không chuyển bệnh nhân đang phục vụ.

## Phase 4 DoD

- Chức năng đạt: Admin quản lý tài khoản, khoa/phòng, dịch vụ, bác sĩ, lịch làm việc; lễ tân quản lý lịch hẹn nâng cao.
- API phải hoạt động: CRUD `/users`, `/departments`, `/rooms`, `/services`, `/doctors`, `/doctor-schedules`, appointment update/cancel/no-show/late.
- Màn hình phải hoạt động: Admin settings/catalog screens, doctor schedule, receptionist appointment management.
- Test thủ công: tạo dữ liệu nền mới, khóa user, tạo lịch trùng phải bị chặn, hủy/đổi lịch hẹn có thông báo.

## Phase 5 DoD

- Chức năng đạt: monitoring có dữ liệu tải/snapshot/cảnh báo; demand smoothing có gợi ý; reports có lọc và export cơ bản; UI không còn mock ở luồng nghiệp vụ chính.
- API phải hoạt động: monitoring/resource-load/snapshot, smoothing/reallocation, reports/filter/export, audit logs.
- Màn hình phải hoạt động: Monitoring, Reports, Audit/History, polished role dashboards.
- Test thủ công: tạo tải giả lập, thấy WARNING/OVERLOAD; tạo report theo ngày/khoa/phòng; export file; kiểm tra lỗi API hiển thị thông báo rõ.
