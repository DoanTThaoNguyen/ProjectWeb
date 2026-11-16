# Yêu cầu và phạm vi

Ký hiệu nguồn gốc:
- **[YC]**: yêu cầu có trong đề bài
- **[GĐ]**: giả định demo, chưa phải chính sách đã được xác nhận
- **[ĐX]**: đề xuất của nhóm

## 1. Mục tiêu

- [YC] Khách xem thực đơn, chọn dịch vụ và gửi yêu cầu tổ chức tiệc tại nhà.
- [YC] Công ty tiếp nhận, tư vấn, báo giá và xác nhận đặt tiệc.
- [YC] Công ty đến địa điểm của khách để nấu, setup và phục vụ.
- [YC] Quản lý lên lịch và phân chia nhân viên. Nhân viên xem lịch và công việc được giao.
- [YC] Thống kê doanh thu và tình hình đặt tiệc.
- [ĐX] Về sau có app di động dùng chung REST API (chưa làm trong đợt này).

## 2. Phạm vi demo

- [GĐ] Chỉ có một công ty tổ chức tiệc. Không làm sàn nhiều nhà cung cấp, không có hoa hồng.
- [GĐ] Có 4 vai trò: CUSTOMER, COORDINATOR, STAFF, ADMIN. Đăng ký công khai chỉ tạo được tài khoản CUSTOMER.
- [GĐ] Khách chưa đăng nhập vẫn xem được dịch vụ và thực đơn. Muốn gửi yêu cầu thì phải đăng nhập.
- [GĐ] Tiền tệ là VND, giao diện tiếng Việt, múi giờ Asia/Ho_Chi_Minh.
- [GĐ] Thanh toán do người có quyền ghi nhận thủ công. Chưa tích hợp cổng thanh toán.
- [GĐ] Đơn phải đặt trước giờ khai tiệc ít nhất 24 giờ. Giá trị này chỉnh được trong Cấu hình.

## 3. Chức năng theo vai trò

### Khách hàng
- Trang chủ, danh sách dịch vụ (tiệc bàn, buffet, BBQ, teabreak), danh sách thực đơn có tìm kiếm và lọc theo hình thức và khoảng giá, trang chi tiết thực đơn.
- Thực đơn tính giá **theo bàn** (kèm số khách tiêu chuẩn mỗi bàn) hoặc **theo khách**. Thực đơn đã ngừng phục vụ thì không chọn được.
- Form đặt tiệc 4 bước, gồm: người liên hệ, số điện thoại, loại tiệc, thực đơn, giờ bắt đầu và dự kiến kết thúc, địa chỉ, số khách, số bàn, ngân sách, dịch vụ bổ sung, ghi chú. Form hiện **giá tạm tính**, ghi rõ đó chưa phải báo giá chính thức. Có trang xác nhận trước khi gửi.
- Xem "Đơn của tôi" và chi tiết đơn: báo giá, tiến độ, thanh toán, lịch sử trạng thái.
- Chấp nhận báo giá còn hiệu lực.
- [GĐ] Khách tự hủy trực tiếp nếu chưa chấp nhận báo giá. Sau khi đã chấp nhận thì chỉ gửi được **yêu cầu hủy** để điều phối xử lý.
- Cập nhật thông tin tài khoản và đổi mật khẩu.

### Điều phối
- Tìm và lọc đơn theo ngày, khách, trạng thái, có phân trang.
- Lập báo giá gồm các dòng: thực đơn, dịch vụ bổ sung, phí khác, giảm giá. Báo giá có tiền cọc, hạn hiệu lực, ghi chú và điều kiện. Mỗi lần sửa sau khi đã gửi sẽ tạo phiên bản mới.
- Ghi nhận thanh toán (cọc, phần còn lại, hoàn tiền), có chống ghi trùng.
- Phân công nhân viên, chặn trùng lịch, gợi ý nhân viên theo kỹ năng và giờ rảnh.
- Xem lịch phân công theo tuần và dashboard thống kê.

### Nhân viên
- Xem việc được giao: địa điểm, thời gian, nhiệm vụ.
- Cập nhật tiến độ của chính mình theo thứ tự: Đã giao → Đã nhận việc → Đang làm → Hoàn thành.
- Không được sửa giá, xác nhận thanh toán hay phân công người khác. Nhân viên hoàn thành nhiệm vụ của mình **không** làm đơn tự hoàn tất.

### Quản trị
- Quản lý tài khoản: tạo, đổi vai trò, khóa và mở khóa.
- Quản lý nhân viên và kỹ năng (đầu bếp, phụ bếp, phục vụ, setup, vận chuyển).
- Quản lý danh mục món, món ăn, thực đơn, dịch vụ bổ sung và cấu hình demo.
- Xem nhật ký thao tác.
- Ưu tiên **ngừng hoạt động** thay vì xóa dữ liệu đã được dùng.

## 4. Yêu cầu phi chức năng

- Mật khẩu băm bằng BCrypt. Quyền và quyền sở hữu tài nguyên được kiểm tra ở backend, không chỉ dựa vào việc ẩn nút trên giao diện.
- Tiền tính ở backend bằng BigDecimal / DECIMAL(15,2), không tin tổng tiền do frontend gửi lên.
- Dữ liệu được kiểm tra ở cả frontend và backend: thời gian không ở quá khứ, số lượng phải dương, số điện thoại hợp lệ, trường bắt buộc không được bỏ trống.
- Giao diện dùng tốt trên máy tính và điện thoại. Mọi màn hình đều có trạng thái đang tải, rỗng, lỗi và thành công.
- Ảnh demo dùng giấy phép CC0 và lưu ngay trong repo (xem `frontend/public/images/CREDITS.md`).
