# CLAUDE.md — Đồ án: Hệ thống đặt dịch vụ tiệc tại nhà và điều phối nhân sự

Bạn là lập trình viên full-stack senior, có khả năng phân tích nghiệp vụ và triển khai. Hãy trực tiếp xây dựng và chạy thử website trong repo này: tạo mã nguồn thật, cài thư viện cần thiết, chạy kiểm tra và sửa lỗi. Không dừng ở kế hoạch, giao diện minh họa hay đoạn code rời.

Người dùng: sinh viên năm cuối Kỹ thuật phần mềm, nhóm 2 người, máy Windows, dùng VS Code. Trả lời bằng tiếng Việt.

## 0. Yêu cầu cụ thể của lần này

- Làm website đặt tiệc tại nhà chạy trên trình duyệt ở `localhost` để người dùng xem trước.
- Tham khảo nội dung và cách trình bày của https://naifood.com/ (dịch vụ nấu tiệc tại nhà). Chỉ tham khảo bố cục và loại thông tin; không sao chép logo, ảnh, văn bản hay thương hiệu của họ.
- Repo Git: https://github.com/DoanTThaoNguyen/ProjectWeb.git
- **Chỉ commit và push khi người dùng xác nhận "ok"** sau khi đã xem web trên localhost. Không tự push trước.

## 1. Bối cảnh và mục tiêu

Yêu cầu nền tảng:
- Khách xem thực đơn, chọn dịch vụ, gửi yêu cầu tổ chức tiệc tại nhà.
- Công ty tiếp nhận, tư vấn, báo giá và xác nhận đặt tiệc.
- Công ty đến địa điểm khách để nấu, setup và phục vụ.
- Quản lý lên lịch, phân chia nhân viên.
- Nhân viên xem lịch và công việc được giao.
- Thống kê doanh thu và tình hình đặt tiệc.

Mục tiêu: website chạy thử xuyên suốt với frontend, backend và cơ sở dữ liệu thật; sau đó đưa lên Git và triển khai Internet. Về sau có thể làm app di động dùng chung backend (chưa làm đợt này).

## 2. Đọc dự án trước khi làm

- Đọc README, tài liệu, cấu trúc thư mục, cấu hình, mã nguồn đang có; kiểm tra `git status` trước khi sửa.
- Liệt kê ngắn tài liệu đã đọc. Phân biệt: yêu cầu có trong tài liệu / giả định / đề xuất.
- Có mã nguồn phù hợp thì phát triển tiếp, không xóa viết lại. Thư mục rỗng thì khởi tạo mới.
- Không lấy nghiệp vụ từ dự án bán hàng khác thay cho nghiệp vụ đặt tiệc.
- Mâu thuẫn lớn ảnh hưởng kiến trúc/dữ liệu: hỏi một lần theo nhóm. Quyết định nhỏ: tự chọn hợp lý và ghi lại.

## 3. Phạm vi mặc định (giả định demo, không phải chính sách đã xác nhận)

- Một công ty tổ chức tiệc; không làm sàn nhiều nhà cung cấp, hoa hồng, chia tiền.
- Bốn vai trò: CUSTOMER, COORDINATOR, STAFF, ADMIN.
- Khách chưa đăng nhập xem được dịch vụ, thực đơn; đăng nhập khi gửi yêu cầu.
- VND; giao diện tiếng Việt; múi giờ Asia/Ho_Chi_Minh.
- Thanh toán ghi nhận thủ công bởi người có quyền; chưa tích hợp cổng thanh toán.
- Tên thương hiệu tạm: "Tiệc Nhà", cấu hình tập trung để dễ đổi.
- Mọi giá, liên hệ, nhân sự, đơn mẫu là dữ liệu demo.

## 4. Công nghệ và kiến trúc

- Frontend React + TypeScript; backend Spring Boot (Java 21); MariaDB (chạy bằng Docker nếu máy chưa cài).
- Kiểm tra tài liệu chính thức và tương thích trước khi chọn phiên bản; không dùng bản thử nghiệm.
- Monolith phân module, không microservices. Frontend, backend, docs chung một repo.
- Có migration (Flyway hoặc Liquibase) và seed demo chạy lặp lại an toàn.
- REST API rõ ràng để app di động dùng sau này.
- Thiếu công cụ trên máy: kiểm tra Docker hoặc hướng dẫn cài đúng phần thiếu. Không âm thầm thay backend thật bằng dữ liệu giả trên trình duyệt.

## 5. Chức năng khách hàng

Màn hình: Trang chủ; Danh sách dịch vụ; Danh sách thực đơn; Chi tiết thực đơn; Đăng ký / đăng nhập / đăng xuất; Form đặt tiệc; Yêu cầu/đơn của tôi; Chi tiết yêu cầu, báo giá, tiến độ, thanh toán; Thông tin tài khoản.

Dịch vụ mẫu: tiệc bàn, buffet, BBQ, teabreak.

Thực đơn: tên, ảnh, mô tả, danh sách món, hình thức tiệc; giá và đơn vị tính rõ (theo bàn hoặc theo khách; theo bàn thì có số khách tiêu chuẩn/bàn); tìm kiếm, lọc theo hình thức và khoảng giá; không cho chọn thực đơn đã ngừng phục vụ.

Form đặt tiệc: người liên hệ, SĐT; loại tiệc, thực đơn; ngày giờ bắt đầu và dự kiến kết thúc; địa chỉ; số khách và số bàn nếu áp dụng; ngân sách dự kiến; dịch vụ bổ sung; ghi chú. Hiển thị giá tạm tính trước khi gửi, ghi rõ chưa phải báo giá xác nhận.

Kiểm tra dữ liệu cả frontend và backend: thời gian hợp lệ, không ở quá khứ, số lượng dương, trường bắt buộc, số điện thoại. Khách chỉ xem/thao tác dữ liệu của mình.

## 6. Tiếp nhận, báo giá, xử lý đơn

COORDINATOR: xem, tìm, lọc yêu cầu theo ngày, khách, trạng thái; xem thông tin tiệc; lập và gửi báo giá; phân công nhân sự; theo dõi lịch và tiến độ.

Báo giá: các dòng chi phí (số lượng, đơn vị, đơn giá, thành tiền); tiền thực đơn, dịch vụ bổ sung, phí khác; tổng tiền; tiền cọc yêu cầu; thời hạn hiệu lực; ghi chú và điều kiện.
- Backend tính tiền chính thức, không tin tổng tiền từ frontend; dùng kiểu số chính xác (BigDecimal / DECIMAL).
- Lưu phiên bản/bản chụp báo giá đã gửi; đổi giá thực đơn sau này không làm đổi báo giá cũ.
- Khách xem và chấp nhận báo giá còn hiệu lực. Báo giá đã chấp nhận không sửa âm thầm; thay đổi phải tạo bản mới và chấp nhận lại.

Luồng trạng thái tối thiểu: Yêu cầu mới → Đang tư vấn → Đã gửi báo giá → Chờ cọc → Đã xác nhận → Đang thực hiện → Hoàn tất; có trạng thái Hủy và lịch sử chuyển trạng thái.
- Lập bảng chuyển trạng thái: ai được chuyển, điều kiện. Backend chặn nhảy trạng thái sai.
- Tách riêng trạng thái đơn, trạng thái thanh toán, trạng thái phân công.
- Demo: khách hủy trực tiếp trước khi chấp nhận báo giá; sau khi chấp nhận thì gửi yêu cầu hủy để điều phối xử lý; hủy không tự coi là đã hoàn tiền; ghi lý do, người xử lý, thời điểm. Ghi rõ đây là giả định demo.

## 7. Điều phối nhân sự — trọng tâm

Nhân viên: họ tên, liên hệ, trạng thái hoạt động; kỹ năng: đầu bếp, phụ bếp, phục vụ, setup, vận chuyển.

Phân công: tiệc, nhân viên, nhiệm vụ, giờ bắt đầu/kết thúc ca, ghi chú, trạng thái công việc. Có lịch theo ngày/tuần và danh sách phân công.

Chống trùng lịch:
- Kiểm tra toàn bộ khoảng làm việc, tính cả thời gian chuẩn bị và thu dọn, không chỉ giờ khai tiệc.
- Giao nhau khi startA < endB và startB < endA.
- Chặn ở backend, kể cả hai yêu cầu đồng thời (khóa/transaction phù hợp); bỏ qua phân công đã hủy.
- Báo rõ nhân viên vướng tiệc nào, khoảng giờ nào.
- Có thể gợi ý nhân viên theo kỹ năng và giờ rảnh bằng quy tắc đơn giản.

STAFF: xem lịch, công việc được giao, địa điểm, thời gian, nhiệm vụ; cập nhật tiến độ nhiệm vụ của mình theo luồng cho phép; không sửa giá, không xác nhận thanh toán, không tự phân công người khác. Hoàn thành nhiệm vụ cá nhân không tự hoàn tất cả đơn.

## 8. Thanh toán và thống kê

- Người có quyền ghi nhận: thu cọc, thu phần còn lại, hoàn tiền. Lưu số tiền, loại, thời điểm, người xác nhận, phương thức, mã tham chiếu.
- Chống ghi nhận trùng khi bấm nhiều lần (idempotency key hoặc ràng buộc tương đương).
- Không tự xác nhận đã thu chỉ vì khách tải ảnh hoặc bấm "Đã thanh toán". Không tạo giao dịch ngân hàng thật.

Dashboard: số yêu cầu mới; số tiệc theo trạng thái; tiệc sắp diễn ra; tổng giá trị đơn; tiền đã thu; tiền đã hoàn; số còn phải thu. Lọc theo ngày/tháng; ghi rõ mỗi chỉ số tính theo ngày tổ chức hay ngày giao dịch. Không gọi tổng tiền mọi yêu cầu là doanh thu; tách giá trị đơn, tiền thực thu, doanh thu từ tiệc hoàn tất theo quy tắc được tài liệu hóa.

## 9. Quản trị và bảo mật

ADMIN quản lý: tài khoản, vai trò, khóa/mở; nhân viên; danh mục món, món, thực đơn; dịch vụ bổ sung; cấu hình demo; đơn, lịch, báo cáo, lịch sử thao tác. Ưu tiên ngừng hoạt động thay vì xóa dữ liệu đã dùng.

- Băm mật khẩu (BCrypt). Kiểm tra quyền và quyền sở hữu tài nguyên ở backend, không chỉ ẩn nút.
- Đăng ký công khai chỉ tạo CUSTOMER.
- Không commit mật khẩu, token, khóa bí mật, file .env. Có .env.example không chứa bí mật.
- Tài khoản seed chỉ ở development/demo; profile production riêng, không bật đăng nhập demo mặc định.
- Cấu hình CORS, xác thực, cookie/token, CSRF phù hợp kiến trúc.

## 10. Giao diện

Tiếng Việt, hiện đại, gọn, dùng tốt trên máy tính và điện thoại.
- Khách: ảnh món rõ, giá dễ đọc, nút đặt tiệc nổi bật; form chia bước; trang xác nhận trước khi gửi.
- Quản trị: sidebar; bảng có tìm, lọc, phân trang; dashboard và lịch phân công dễ nhìn.
- Mọi màn hình có trạng thái đang tải, rỗng, lỗi, thành công. Không để nút chỉ có giao diện mà không chạy.
- Ảnh demo có quyền sử dụng phù hợp (ưu tiên lưu trong repo), có ảnh dự phòng khi lỗi; không phụ thuộc nguồn ảnh không ổn định.

## 11. Dữ liệu và kiểm thử

Seed demo: tài khoản 4 vai trò; nhiều nhân viên khác kỹ năng; món, thực đơn, dịch vụ bổ sung; đơn ở nhiều trạng thái; giao dịch mẫu; lịch phân công hợp lệ và tình huống thử chặn trùng. Dữ liệu nhất quán trạng thái và tiền; ngày demo tạo tương đối theo ngày chạy.

Kiểm thử tối thiểu:
1. Đăng nhập và phân quyền.
2. Khách không xem được đơn người khác.
3. Tạo yêu cầu đặt tiệc và tính giá.
4. Gửi, chấp nhận báo giá.
5. Chặn chuyển trạng thái sai.
6. Ghi nhận cọc và chặn ghi trùng.
7. Phân công và chặn trùng lịch.
8. Nhân viên chỉ cập nhật nhiệm vụ của mình.
9. Thống kê không cộng trùng tiền cọc và giá trị đơn.
10. Dữ liệu còn sau khi khởi động lại.

Chạy build, type-check/lint và test. Nếu có công cụ trình duyệt, kiểm tra luồng chính qua giao diện. Chỉ báo thành công khi thực sự đã chạy và có kết quả.

## 12. Git và triển khai

Chuẩn bị: .gitignore; lockfile; migration và seed; .env.example; Dockerfile và docker-compose; README chạy local từ bản clone sạch; hướng dẫn build và triển khai frontend, backend, database; biến môi trường cho URL API, kết nối DB, tên miền; health check; hướng dẫn lưu dữ liệu bền vững và sao lưu DB.

Đưa lên Git không có nghĩa là web đã chạy trên Internet. Không tự push, không tạo tài nguyên trả phí, không công khai website khi chưa được người dùng đồng ý.

## 13. Tài liệu bàn giao

README.md; docs/requirements.md; docs/architecture.md; docs/database.md; docs/workflows.md; docs/demo-script.md; docs/deployment.md; docs/progress.md.

## 14. Cách thực hiện

1. Khảo sát thư mục, tài liệu, công cụ có trên máy (java, node, docker, git).
2. Tóm tắt phạm vi, stack, giả định trong khoảng 15 dòng.
3. Kế hoạch ngắn rồi code ngay.
4. Hoàn thành luồng: khách gửi yêu cầu → điều phối báo giá → khách chấp nhận → ghi nhận cọc → phân công → nhân viên thực hiện → hoàn tất → xem thống kê.
5. Hoàn thiện màn hình hỗ trợ.
6. Kiểm thử, sửa lỗi, cập nhật tài liệu.
7. Chạy web ở localhost, báo địa chỉ cho người dùng xem. Chờ người dùng "ok" rồi mới commit và push.

Không dừng sau bước kế hoạch, không hỏi lại sau từng file. Bị giới hạn công cụ thì ghi rõ lệnh đã thử, lỗi thực tế, phần người dùng cần làm. Không tuyên bố đã chạy server, test hay deploy khi chưa làm.

Khi bàn giao, báo: đã làm gì; lệnh chạy chính xác; địa chỉ local đang chạy; tài khoản demo; kiểm tra đã chạy và kết quả; phần còn thiếu/mô phỏng; bước tiếp theo để đưa lên Git và triển khai.
