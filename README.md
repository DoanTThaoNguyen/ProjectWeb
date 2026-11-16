# Tiệc Nhà — Hệ thống đặt dịch vụ tiệc tại nhà và điều phối nhân sự

Đồ án tốt nghiệp ngành Kỹ thuật phần mềm. Khách hàng xem thực đơn và gửi yêu cầu đặt tiệc tại nhà. Công ty tiếp nhận, báo giá, ghi nhận tiền cọc, phân công nhân viên đến nấu và phục vụ, rồi theo dõi doanh thu.

> "Tiệc Nhà" là tên thương hiệu tạm. Mọi giá, số liên hệ, nhân sự và đơn mẫu đều là **dữ liệu demo**.

## Chức năng chính

| Vai trò | Làm được gì |
|---|---|
| Khách (CUSTOMER) | Xem dịch vụ và thực đơn; đặt tiệc qua form 4 bước, có giá tạm tính; theo dõi đơn; chấp nhận báo giá; hủy đơn hoặc gửi yêu cầu hủy |
| Điều phối (COORDINATOR) | Tìm và lọc đơn; lập và gửi báo giá theo phiên bản; ghi nhận thanh toán; phân công nhân viên, có chặn trùng lịch; xem lịch tuần và dashboard |
| Nhân viên (STAFF) | Xem việc được giao và lịch tuần; cập nhật tiến độ nhiệm vụ của chính mình |
| Quản trị (ADMIN) | Quản lý mọi thứ của điều phối, cộng thêm tài khoản, nhân viên, thực đơn, món ăn, dịch vụ bổ sung, cấu hình và nhật ký thao tác |

## Công nghệ

- **Frontend:** React 19, TypeScript, Vite, React Router (thư mục `frontend/`)
- **Backend:** Spring Boot 4.1, Java 21, Spring Security (JWT + BCrypt), JPA, Flyway (thư mục `backend/`)
- **Cơ sở dữ liệu:** MariaDB

Kiến trúc là một ứng dụng monolith chia module, với REST API dưới `/api` để sau này app di động dùng lại được. Chi tiết xem [docs/architecture.md](docs/architecture.md).

## Chạy trên máy (Windows)

### Cần cài trước

- JDK 21 trở lên
- Node.js 20 trở lên
- MariaDB 11 (bản cài Windows, không cần chạy dịch vụ hệ thống)

### Lần đầu

```powershell
git clone https://github.com/DoanTThaoNguyen/ProjectWeb.git
cd ProjectWeb
copy .env.example .env      # rồi sửa mật khẩu, JWT_SECRET trong .env

# Tạo MariaDB riêng cho dự án ở cổng 3307 (dữ liệu nằm trong .localdb/)
powershell -ExecutionPolicy Bypass -File scripts\db-init.ps1
# Bật DB ở một cửa sổ khác (bước 1 bên dưới), rồi tạo database và user:
powershell -ExecutionPolicy Bypass -File scripts\db-setup.ps1
```

### Mỗi lần chạy (3 cửa sổ terminal)

```powershell
# 1. Cơ sở dữ liệu (để nguyên cửa sổ này)
powershell -ExecutionPolicy Bypass -File scripts\db-start.ps1

# 2. Backend: http://localhost:8080
cd backend
.\mvnw.cmd spring-boot:run

# 3. Frontend: http://localhost:5173
cd frontend
npm ci
npm run dev
```

Mở **http://localhost:5173**. Khi backend chạy lần đầu, Flyway tự tạo bảng. Nếu đang ở profile `dev`, backend còn tự nạp dữ liệu demo, và chỉ nạp khi bảng còn trống, nên chạy lại nhiều lần vẫn an toàn.

Kiểm tra backend còn sống: http://localhost:8080/actuator/health

### Tài khoản demo (chỉ có ở profile `dev`)

Mật khẩu chung: `Demo@123`

| Vai trò | Email | Mở trang |
|---|---|---|
| Quản trị | admin@tiecnha.vn | /quan-tri |
| Điều phối | dieuphoi@tiecnha.vn | /quan-tri |
| Khách | khach@tiecnha.vn, khach2@tiecnha.vn | / |
| Nhân viên | bep.tuan@tiecnha.vn, phucvu.lan@tiecnha.vn, setup.khoa@tiecnha.vn | /nhan-vien |

## Lệnh kiểm tra

```powershell
cd frontend; npm run build; npm run lint     # type-check + build + lint
cd backend;  .\mvnw.cmd test                 # cần MariaDB đang chạy
```

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Yêu cầu, phạm vi, giả định demo |
| [docs/architecture.md](docs/architecture.md) | Kiến trúc, module, API, bảo mật |
| [docs/database.md](docs/database.md) | Lược đồ CSDL, migration, seed |
| [docs/workflows.md](docs/workflows.md) | Luồng trạng thái đơn, báo giá, thanh toán, phân công, cách tính thống kê |
| [docs/demo-script.md](docs/demo-script.md) | Kịch bản demo từng bước |
| [docs/deployment.md](docs/deployment.md) | Biến môi trường, build, triển khai, sao lưu |
| [docs/progress.md](docs/progress.md) | Tiến độ, phần còn thiếu |

## Bảo mật

- Không commit file `.env`. Chỉ commit `.env.example`, file này không chứa bí mật.
- Profile `prod` không nạp tài khoản demo. Mọi bí mật lấy từ biến môi trường.
