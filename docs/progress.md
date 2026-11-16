# Tiến độ

_Cập nhật: 16/11/2026_

## Đã xong

### Đợt 1: Trang khách hàng
- Trang chủ, dịch vụ, thực đơn (có tìm kiếm và lọc), chi tiết thực đơn
- Đăng ký, đăng nhập, đăng xuất (JWT + BCrypt); trang tài khoản
- Form đặt tiệc 4 bước, có giá tạm tính và trang xác nhận
- Đơn của tôi; chi tiết đơn gồm báo giá, chấp nhận, hủy hoặc yêu cầu hủy, thanh toán, lịch sử
- Flyway migration và seed demo cho profile `dev`
- Ảnh demo CC0 lưu trong repo

### Đợt 2: Điều phối, nhân viên, quản trị, thống kê
- Điều phối:
  - Danh sách đơn có tìm, lọc, phân trang; chuyển trạng thái theo bảng luồng; xử lý yêu cầu hủy
  - Báo giá theo phiên bản
  - Ghi nhận thanh toán có `Idempotency-Key`
  - Phân công có chặn trùng lịch (khóa dòng nhân viên, tính cả thời gian chuẩn bị và thu dọn) và gợi ý nhân viên
  - Lịch phân công theo tuần
- Nhân viên: việc của tôi, lịch tuần, cập nhật tiến độ theo luồng cho phép
- Quản trị: tài khoản, nhân viên, thực đơn, món ăn, dịch vụ bổ sung, cấu hình, nhật ký thao tác
- Dashboard: giá trị đơn, đã thu, đã hoàn, còn phải thu, doanh thu tiệc hoàn tất, tiệc sắp diễn ra

### Đợt 3: Tài liệu
- README và bộ tài liệu trong `docs/`

## Còn thiếu

| Hạng mục | Ghi chú |
|---|---|
| Test tự động | Backend mới có test khởi động context (`contextLoads`). Còn thiếu test cho 10 tình huống tối thiểu: phân quyền, sở hữu đơn, tính giá, báo giá, chặn chuyển trạng thái sai, chặn ghi trùng, chặn trùng lịch, nhân viên chỉ sửa việc của mình, thống kê không cộng trùng, dữ liệu còn sau khi khởi động lại |
| Docker | Chưa có Dockerfile và docker-compose |
| Triển khai Internet | Chưa làm, chờ nhóm quyết định nơi host |
| App di động | Ngoài phạm vi đợt này; đã có REST API sẵn để dùng lại |

## Bước tiếp theo đề xuất

1. Viết test tích hợp cho 10 tình huống trên.
2. Thêm Dockerfile và docker-compose.
3. Chọn nơi host, rồi triển khai theo [deployment.md](deployment.md).
