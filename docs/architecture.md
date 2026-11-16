# Kiến trúc

## Tổng quan

```
Trình duyệt ──► Frontend React (Vite, cổng 5173)
                    │  /api/*  (dev: Vite proxy; prod: VITE_API_URL)
                    ▼
               Backend Spring Boot (cổng 8080) ──► MariaDB (cổng 3307 local)
```

- Kiến trúc là **monolith chia module**, không dùng microservice. Frontend, backend và tài liệu nằm chung một repo.
- Backend trả về JSON qua REST, không giữ phiên làm việc (stateless). Xác thực bằng JWT gửi trong header `Authorization: Bearer ...`.
- Vì dùng token trong header thay cho cookie phiên, CSRF được tắt. CORS chỉ cho phép các origin khai báo trong `CORS_ORIGINS`.

## Module backend (`backend/src/main/java/vn/tiecnha/`)

| Package | Trách nhiệm |
|---|---|
| `auth` | Đăng ký, đăng nhập, JWT, cấu hình Spring Security, tài khoản và vai trò |
| `catalog` | Dịch vụ, danh mục món, món ăn, thực đơn, dịch vụ bổ sung; API công khai |
| `booking` | Đơn tiệc, tính giá tạm tính, luồng trạng thái (`BookingWorkflow`), lịch sử trạng thái |
| `quote` | Báo giá theo phiên bản, các dòng chi phí |
| `payment` | Ghi nhận thanh toán, chống ghi trùng, tổng hợp số đã thu |
| `staff` | Nhân viên, kỹ năng |
| `assignment` | Phân công, chặn trùng lịch, cổng nhân viên |
| `coord` | API cho điều phối và quản trị khi xử lý đơn |
| `admin` | Quản trị tài khoản, danh mục, cấu hình, nhật ký |
| `report` | Dashboard thống kê |
| `common` | Lỗi chung, phân trang, tiền tệ, cấu hình, nhật ký thao tác |
| `seed` | Dữ liệu demo, chỉ chạy khi `app.seed-demo=true` |

## Nhóm API

| Tiền tố | Ai được gọi |
|---|---|
| `/api/public/**` | Ai cũng gọi được: cấu hình, dịch vụ, thực đơn, dịch vụ bổ sung, tính tạm tính, bảng luồng trạng thái |
| `/api/auth/**`, `/api/me` | Đăng ký, đăng nhập, thông tin cá nhân |
| `/api/bookings/**` | CUSTOMER, và chỉ với đơn của chính mình |
| `/api/coord/**` | COORDINATOR, ADMIN |
| `/api/staff/**` | STAFF, và chỉ với nhiệm vụ của chính mình |
| `/api/admin/**` | ADMIN |
| `/actuator/health` | Health check |

Khi có lỗi, API trả JSON gồm mã lỗi (ví dụ `SCHEDULE_CONFLICT`, `INVALID_TRANSITION`) và thông báo tiếng Việt.

## Frontend (`frontend/src/`)

- `api/`: lớp gọi API, kiểu dữ liệu TypeScript.
- `config.ts`: tên thương hiệu và thông tin liên hệ demo, gom về một chỗ để dễ đổi.
- Có ba khu giao diện:
  - Khu khách: `/`, `/dich-vu`, `/thuc-don`, `/dat-tiec`, `/don-cua-toi`, `/tai-khoan`
  - Khu quản trị (có sidebar): `/quan-tri/*`
  - Khu nhân viên: `/nhan-vien/*`

## Quyết định thiết kế chính

- **Tiền chính thức do backend tính.** Frontend chỉ hiển thị. Khi lưu báo giá, backend tính lại thành tiền của từng dòng và tổng tiền.
- **Lưu bản chụp giá.** Đơn lưu tên và giá thực đơn tại thời điểm gửi. Báo giá lưu các dòng chi phí riêng. Vì vậy đổi giá thực đơn sau này không làm thay đổi đơn hay báo giá cũ.
- **Tách ba trạng thái** của một đơn: trạng thái đơn, trạng thái thanh toán, trạng thái phân công.
- **Chống trùng lịch dưới truy cập đồng thời.** Khi phân công, backend khóa dòng nhân viên (`PESSIMISTIC_WRITE`) trong transaction rồi mới kiểm tra giao nhau. Nhờ vậy hai yêu cầu gửi cùng lúc cho cùng một nhân viên không thể cùng lọt qua.
- **Chống ghi thanh toán trùng.** Mỗi lần ghi nhận gửi kèm header `Idempotency-Key`. Cột này có ràng buộc UNIQUE trong DB.
- **Đơn dùng optimistic lock** (cột `version`), tránh hai người cùng sửa một đơn mà ghi đè lên nhau.
