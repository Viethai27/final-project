# Kiểm thử và mô phỏng điều phối bệnh nhân

## Testing Objectives

Mục tiêu của bộ kiểm thử là xác minh tính đúng đắn của các thành phần cốt lõi trong backend liên quan đến điều phối bệnh nhân và xử lý hàng đợi. Cụ thể, bộ test tập trung vào ba nhóm năng lực chính:

1. Đảm bảo logic sắp xếp hàng đợi tuân thủ đúng thứ tự ưu tiên giữa các lane và trạng thái.
2. Đảm bảo công thức tính điểm ưu tiên và gợi ý điều phối cho từng phòng phản ánh đúng các ràng buộc nghiệp vụ.
3. Đánh giá mô hình mô phỏng độc lập để minh họa hiệu quả tương đối của hệ thống điều phối có gợi ý so với chiến lược không có gợi ý.

Bộ kiểm thử được xây dựng bằng Vitest, không kết nối cơ sở dữ liệu thật, toàn bộ dữ liệu đầu vào đều được mô phỏng bằng mock hoặc dữ liệu in-memory.

## Testing Scope

Phạm vi kiểm thử bao gồm các module sau:

- `backend/src/modules/queue/**tests**/*`
- `backend/src/modules/dispatch/**tests**/*`
- `backend/src/simulation/**tests**/*`
- `backend/src/simulation/dispatch-simulation.ts`

Các nội dung chính được kiểm tra:

- Thứ tự sắp xếp các phần tử trong hàng đợi theo trạng thái, lane và điểm ưu tiên.
- Công thức `PriorityScore` và hàm `Swait`.
- Cơ chế gợi ý phòng trong điều phối bệnh nhân theo từng giai đoạn nghiệp vụ.
- Tạo quyết định điều phối, mapping dữ liệu chi tiết và xử lý trường hợp đã tồn tại quyết định.
- Mô phỏng hiệu quả của hệ thống điều phối trong hai chiến lược: có gợi ý và không có gợi ý.

Tổng cộng có 35 kiểm thử tự động đã được thực thi thành công, với mức coverage tổng đạt 80.54%.

## Test Case Summary Table

| Mã | Nhóm | Nội dung kiểm thử | Mục tiêu xác minh |
| --- | --- | --- | --- |
| TC-Q1 | Queue | WAITING luôn đứng trước DONE | Ưu tiên trạng thái hàng đợi |
| TC-Q2 | Queue | Trong cùng WAITING, PRIORITY đứng trước NORMAL | Ưu tiên lane |
| TC-Q3 | Queue | Thứ tự lane PRIORITY > APPOINTMENT > AFTER_CLS > NORMAL | Quy tắc laneOrder |
| TC-Q4 | Queue | Trong cùng lane, điểm cao hơn đứng trước | So sánh priorityScore |
| TC-Q5 | Queue | Phân trang page=2, limit=2 | Cắt trang đúng số lượng và total |
| TC-Q6 | Queue | Filter status='WAITING' chỉ lấy WAITING | Điều kiện where theo status |
| TC-Q7 | Queue | `getQueueItemById` với id không tồn tại trả 404 | Xử lý ngoại lệ nghiệp vụ |
| TC-P1 | Dispatch | Trẻ <6 tuổi chờ 5 phút phải cao hơn người thường chờ 40 phút | Công thức priority score |
| TC-P2 | Dispatch | `Swait(0)` xấp xỉ 100 | Giá trị biên của hàm mũ |
| TC-P3 | Dispatch | `Swait(45)` xấp xỉ 20 | Mốc tham chiếu theo đề tài |
| TC-P4 | Dispatch | `Swait` giảm đơn điệu theo thời gian | Tính đơn điệu của hàm |
| TC-P5 | Dispatch | Người ≥75 tuổi có thể cao hơn khuyết tật nặng trong điều kiện gần nhau | So sánh điểm ưu tiên |
| TC-P6 | Dispatch | Biến thiên trọng số ±5% không đảo top-1 | Độ ổn định của xếp hạng |
| TC-D1 | Dispatch | Phòng có queue ngắn hơn được xếp hạng cao hơn | Tác động của queueLength |
| TC-D2 | Dispatch | OVERLOAD bị phạt mạnh hơn NORMAL | Tác động của alertLevel |
| TC-D3 | Dispatch | WARNING nhẹ hơn OVERLOAD | Thứ tự penalty cảnh báo |
| TC-D4 | Dispatch | Phòng hiện tại nhận bonus khi bệnh nhân quay lại đúng phòng | Bonus roomMatchesCurrent |
| TC-D5 | Dispatch | estimatedWaitMinutes tính theo công thức | Tính thời gian chờ ước lượng |
| TC-D6 | Dispatch | Score không bao giờ âm | Ràng buộc `Math.max(0, ...)` |
| TC-D7 | Dispatch | Không có candidate rooms thì trả mảng rỗng | Xử lý trường hợp không phù hợp |
| Dispatch list/detail/create | Dispatch | Lấy danh sách, chi tiết và tạo quyết định điều phối | Mapping DTO và transaction |
| Dispatch conflict | Dispatch | Tạo quyết định trùng cho cùng visit trả 409 | Chống tạo bản ghi trùng |
| KC-1 | Flow | Luồng cơ bản EXAM → CLS → CONCLUSION | Kiểm tra stage và roomType |
| KC-2 | Flow | Bệnh nhân ưu tiên chen ngang hàng đợi | Xếp trước theo lane PRIORITY |
| KC-3 | Flow | Bệnh nhân quay lại sau CLS ở lane AFTER_CLS | Ưu tiên luồng sau CLS |
| KC-4 | Flow | Tất cả phòng overload vẫn còn fallback cấp 1 | Lọc theo ngưỡng 1.2 |
| KC-5 | Flow | Không còn phòng phù hợp thì trả mảng rỗng | Không throw ngoại lệ |
| KC-6 | Flow | So sánh peak/off-peak và strategy with suggestion vs random | Đánh giá hiệu quả mô phỏng |
| TC-S1 | Simulation | Chọn phòng rỗng thay vì phòng đầy | Sanity cho `chooseRoom` |
| TC-S2 | Simulation | Nhóm ưu tiên có thời gian chờ trung bình thấp hơn nhóm thường | So sánh nhóm bệnh nhân |
| TC-S3 | Simulation | `avgWaitTime` có hệ thống nhỏ hơn random qua 10 runs | Hiệu quả chiến lược |
| TC-S4 | Simulation | `overloadEvents` có hệ thống không vượt random | Giảm sự cố quá tải |
| TC-S5 | Simulation | `throughput` không vượt quá `roomCapacity × numRooms` trong scenario nhỏ | Ràng buộc công suất |

## Test Data Strategy

Bộ kiểm thử sử dụng chiến lược dữ liệu giả lập có cấu trúc rõ ràng, nhằm tái hiện đúng các tình huống nghiệp vụ mà không phụ thuộc vào cơ sở dữ liệu thật. Các nguyên tắc chính gồm:

- Dùng mock Prisma để cô lập logic service khỏi tầng lưu trữ.
- Tạo dữ liệu đầu vào theo từng kịch bản, bao gồm visit, room, doctor, queue item, resource load và dispatch decision.
- Gắn nhãn dữ liệu bằng ID và timestamp cố định để bảo đảm tính lặp lại của kết quả.
- Phân tách dữ liệu theo nhóm: dữ liệu hàng đợi, dữ liệu điều phối, dữ liệu quyết định điều phối và dữ liệu mô phỏng.

Đối với mô phỏng, dữ liệu sinh ra hoàn toàn trong bộ nhớ:

- Bệnh nhân được sinh theo chuỗi thời gian trong một ca khám.
- Tỷ lệ đến theo khung giờ được cấu hình sẵn trong `SIMULATION_CONFIG`.
- Tỷ lệ bệnh nhân ưu tiên được xác định bằng tham số `priorityRatio`.
- Kết quả mô phỏng được ghi ra `backend/src/simulation/results/simulation-result.json` để phục vụ trình bày báo cáo.

## Simulation Design

Mô đun mô phỏng `backend/src/simulation/dispatch-simulation.ts` được thiết kế như một script độc lập, không truy cập Prisma và không dùng dữ liệu thật từ MySQL. Thiết kế mô phỏng gồm các thành phần:

- `SIMULATION_CONFIG`: cấu hình mặc định của bài toán mô phỏng, bao gồm tổng thời gian, số phòng, sức chứa phòng, thời gian phục vụ trung bình, tỷ lệ đến theo khung giờ và tỷ lệ bệnh nhân ưu tiên.
- `createRng(seed)`: bộ sinh số ngẫu nhiên giả lập có seed để tăng tính lặp lại.
- `generatePatients(...)`: sinh danh sách bệnh nhân đến theo từng phút trong ca mô phỏng.
- `buildSimulationRooms(...)`: khởi tạo danh sách phòng khám giả lập.
- `rankRoomSuggestions(...)`: xếp hạng gợi ý phòng dựa trên queueLength, utilizationRate, alertLevel và các bonus liên quan.
- `chooseRoom(...)`: chọn phòng tốt nhất từ danh sách gợi ý.
- `simulateScenario(...)`: thực thi một chiến lược mô phỏng trên tập bệnh nhân và phòng.
- `runSimulation(...)`: chạy nhiều lần mô phỏng và tổng hợp số liệu trung bình.
- `formatSimulationReport(...)`: xuất báo cáo dạng bảng để in console.
- `writeSimulationResult(...)`: ghi kết quả ra file JSON.

Mô hình so sánh hai chiến lược:

- `WITH_SUGGESTION`: chiến lược có gợi ý điều phối.
- `RANDOM`: chiến lược không có gợi ý, phân bổ theo quy tắc đơn giản để làm mốc so sánh.

## Simulation Metrics

Các chỉ số được sử dụng trong mô phỏng gồm:

- `avgWaitTime`: thời gian chờ trung bình.
- `maxWaitTime`: thời gian chờ lớn nhất.
- `priorityAvgWait`: thời gian chờ trung bình của nhóm ưu tiên.
- `normalAvgWait`: thời gian chờ trung bình của nhóm thường.
- `overloadEvents`: số lần phòng vượt ngưỡng cảnh báo.
- `throughput`: số bệnh nhân hoàn tất trong ca mô phỏng.

Các số liệu này được tổng hợp từ `simulation-result.json`. Kết quả ghi nhận hiện tại:

| Chỉ số | Có hệ thống | Không có hệ thống | Chênh lệch |
| --- | ---: | ---: | ---: |
| Thời gian chờ TB | 27.7 phút | 79.0 phút | -64.9% |
| Thời gian chờ max | 56.0 phút | 171.0 phút | -67.3% |
| Chờ TB nhóm ưu tiên | 25.6 phút | 75.6 phút | -66.1% |
| Chờ TB nhóm thường | 28.1 phút | 79.5 phút | -64.7% |
| Sự kiện quá tải | 32.5 | 108.5 | -70.0% |
| Throughput (BN/ca) | 45.0 | 81.9 | -45.1% |

## Test Results

Kết quả thực thi trong môi trường hiện tại:

- Số lượng test đã chạy: 35
- Số lượng test pass: 35
- Số lượng test fail: 0
- Coverage tổng: 80.54%
- Build backend: pass

Điều này cho thấy các thành phần quan trọng của hàng đợi, điều phối và mô phỏng đã được kiểm tra ở mức đủ tốt để phục vụ trình bày và thuyết minh trong báo cáo tốt nghiệp.

## Discussion

Kết quả kiểm thử cho thấy hệ thống đáp ứng tốt các yêu cầu nghiệp vụ cốt lõi:

- Quy tắc ưu tiên hàng đợi được duy trì nhất quán theo trạng thái, lane và điểm ưu tiên.
- Công thức ưu tiên và hàm suy giảm thời gian chờ hoạt động đúng theo kỳ vọng toán học.
- Logic điều phối có khả năng tạo gợi ý dựa trên tải phòng, mức cảnh báo và ngữ cảnh bệnh nhân.
- Các ràng buộc khi tạo quyết định điều phối được kiểm tra ở mức service và transaction.
- Mô phỏng cho thấy chiến lược có gợi ý tạo ra thời gian chờ thấp hơn và ít sự kiện quá tải hơn so với chiến lược đối chiếu.

Từ góc nhìn luận văn, bộ test này không chỉ xác minh tính đúng đắn của phần mềm mà còn cung cấp bằng chứng định lượng để lập luận rằng cơ chế điều phối có gợi ý mang lại cải thiện rõ rệt cho trải nghiệm bệnh nhân.

## Limitations

Một số giới hạn của bộ kiểm thử và mô phỏng hiện tại:

- Toàn bộ test sử dụng mock/in-memory, chưa phản ánh đầy đủ môi trường vận hành thực tế với dữ liệu đồng thời và biến động cao.
- Mô phỏng là mô hình rút gọn, chưa mô tả đầy đủ các yếu tố như hủy lịch, no-show, can thiệp thủ công, hoặc các quy tắc điều phối phức tạp cấp bệnh viện.
- Kết quả mô phỏng phụ thuộc vào cấu hình đầu vào và seed, do đó chỉ có giá trị so sánh tương đối trong phạm vi kịch bản đã dựng.
- Coverage mới tập trung mạnh vào `dispatch.service.ts` và `queue.service.ts`, trong khi các controller và route layer chưa được đo lường sâu.

## Future Improvements

Trong các phiên bản tiếp theo, có thể mở rộng theo các hướng sau:

- Bổ sung test cho controller và route layer để tăng độ bao phủ ở tầng HTTP.
- Thêm các kịch bản biên về lỗi dữ liệu, xung đột giao dịch và retry logic.
- Mở rộng mô phỏng sang nhiều ca khám, nhiều loại phòng và nhiều chính sách phân luồng hơn.
- Kết hợp dữ liệu thật đã ẩn danh để hiệu chỉnh mô hình mô phỏng sát thực tế hơn.
- Bổ sung biểu đồ trực quan từ file `simulation-result.json` để sử dụng trực tiếp trong chương báo cáo.

## Kết luận ngắn

Bộ kiểm thử và mô phỏng hiện tại đã cung cấp một nền tảng thực nghiệm khá đầy đủ cho phần đánh giá hệ thống điều phối bệnh nhân. Các kết quả thu được cho phép chứng minh rằng logic hàng đợi, điều phối và mô phỏng đều hoạt động ổn định, đồng thời tạo ra số liệu định lượng đủ để đưa vào luận văn.
