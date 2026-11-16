# Cơ sở dữ liệu

- Hệ quản trị: **MariaDB**, bảng mã `utf8mb4_unicode_ci`.
- Tiền tệ lưu bằng `DECIMAL(15,2)` (VND). Thời gian lưu theo giờ địa phương Asia/Ho_Chi_Minh.
- Lược đồ do **Flyway** quản lý (`backend/src/main/resources/db/migration/`). Hibernate chỉ chạy `validate` để kiểm tra khớp lược đồ, không tự sửa bảng.

## Migration

| File | Nội dung |
|---|---|
| `V1__init_schema.sql` | Tạo toàn bộ bảng, ràng buộc, chỉ mục và cấu hình mặc định |
| `V2__photo_images.sql` | Đổi ảnh minh họa của seed từ SVG sang ảnh chụp (CC0) |

Muốn đổi lược đồ thì luôn thêm file `V<n>__mo_ta.sql` mới. **Không sửa** migration đã chạy.

## Các bảng

| Bảng | Mô tả | Điểm chính |
|---|---|---|
| `users` | Tài khoản | `email` UNIQUE, `role`, `active` để khóa tài khoản, `password_hash` dạng BCrypt |
| `staff`, `staff_skills` | Nhân viên và kỹ năng | Có thể liên kết với `users`. Kỹ năng gồm CHEF, ASSISTANT_CHEF, SERVER, SETUP, DRIVER |
| `party_services` | Hình thức tiệc | Tiệc bàn, buffet, BBQ, teabreak |
| `dish_categories`, `dishes` | Danh mục món, món ăn | Có cờ `active` |
| `menus`, `menu_dishes` | Thực đơn và các món trong thực đơn | `price_unit` là TABLE hoặc GUEST. Nếu là TABLE thì bắt buộc có `guests_per_table` |
| `addons` | Dịch vụ bổ sung | `charge_type` là FIXED, PER_GUEST hoặc PER_TABLE |
| `bookings` | Đơn tiệc | Ba trạng thái tách riêng: `status`, `payment_status`, `assignment_status`. Có bản chụp giá thực đơn, `estimated_total` là tạm tính, cột `version` cho optimistic lock |
| `booking_addons` | Dịch vụ bổ sung của đơn | Lưu bản chụp tên, đơn giá, cách tính |
| `booking_status_history` | Lịch sử chuyển trạng thái | Ghi trạng thái cũ, mới, người đổi, ghi chú, thời điểm |
| `quotes`, `quote_items` | Báo giá theo phiên bản và các dòng chi phí | (`booking_id`, `version_no`) UNIQUE. Ràng buộc 0 ≤ cọc ≤ tổng |
| `payments` | Giao dịch thu và hoàn tiền | `type` là DEPOSIT, BALANCE hoặc REFUND. `idempotency_key` UNIQUE. `amount` > 0 |
| `assignments` | Phân công | Lưu ca làm (`shift_start`, `shift_end`) và `status`. Có chỉ mục (`staff_id`, `shift_start`, `shift_end`) |
| `audit_logs` | Nhật ký thao tác | Người làm, hành động, đối tượng, chi tiết |
| `app_settings` | Cấu hình demo | Xem bảng bên dưới |

### Cấu hình mặc định (`app_settings`)

| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `prep_minutes` | 180 | Số phút chuẩn bị trước giờ khai tiệc, được tính vào ca làm |
| `teardown_minutes` | 90 | Số phút thu dọn sau giờ kết thúc, được tính vào ca làm |
| `deposit_percent` | 30 | Tỷ lệ cọc mặc định, tính trên tổng báo giá |
| `quote_valid_days` | 7 | Số ngày báo giá còn hiệu lực |
| `min_lead_hours` | 24 | Khách phải đặt trước giờ khai tiệc tối thiểu bao nhiêu giờ |

## Dữ liệu demo (seed)

Seed nằm ở `seed/DemoSeeder.java` và chỉ chạy khi `app.seed-demo=true`, tức là ở profile `dev`. Mỗi nhóm dữ liệu chỉ được nạp khi bảng tương ứng còn trống, nên khởi động lại backend bao nhiêu lần cũng không nạp trùng. Ngày của các đơn được tính **tương đối theo ngày chạy**.

- **Tài khoản:** 1 quản trị, 1 điều phối, 2 khách, 3 nhân viên có tài khoản đăng nhập. Mật khẩu chung `Demo@123`.
- **Nhân viên:** 10 người với nhiều kỹ năng khác nhau. Một người ở trạng thái ngừng hoạt động (nghỉ phép).
- **Đơn mẫu** (mã `TNDEMO01` đến `TNDEMO11`), phủ đủ các trạng thái:

| # | Trạng thái | Ghi chú |
|---|---|---|
| 1 | Yêu cầu mới | Tiệc sau 12 ngày |
| 2 | Đang tư vấn | |
| 3 | Đã gửi báo giá | Chờ khách chấp nhận |
| 4 | Chờ cọc | Báo giá đã được chấp nhận |
| 5 | Đã xác nhận | Đã cọc, đã phân công; có báo giá v1 đã bị thay thế bởi v2 |
| 6 | Đã xác nhận | **Trùng giờ với đơn 5**, dùng để thử chặn trùng lịch |
| 7 | Đang thực hiện | Tiệc diễn ra hôm nay |
| 8, 9 | Hoàn tất | Đã thu đủ tiền |
| 10 | Hủy | Khách hủy trước khi có báo giá |
| 11 | Hủy | Hủy sau khi đã cọc, có hoàn tiền một phần |

## Sao lưu và khôi phục

```powershell
# Sao lưu (MariaDB local cổng 3307)
& "C:\Program Files\MariaDB 11.x\bin\mariadb-dump.exe" -h 127.0.0.1 -P 3307 -u root -p tiecnha > backup_tiecnha.sql

# Khôi phục
& "C:\Program Files\MariaDB 11.x\bin\mariadb.exe" -h 127.0.0.1 -P 3307 -u root -p tiecnha < backup_tiecnha.sql
```

Đổi `11.x` cho đúng phiên bản MariaDB đã cài trên máy.

Dữ liệu local nằm ở `.localdb/data/`. Thư mục này đã được gitignore và vẫn còn nguyên sau khi tắt máy.
