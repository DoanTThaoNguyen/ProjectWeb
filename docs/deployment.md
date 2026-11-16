# Triển khai

> Hiện tại web **chỉ chạy trên máy (localhost)**. Đưa code lên GitHub không có nghĩa là web đã chạy trên Internet. Repo **chưa có** Dockerfile và docker-compose; xem mục "Việc còn thiếu" ở cuối file.

## Biến môi trường

Tất cả biến được liệt kê trong `.env.example`. Khi chạy local, backend tự đọc file `.env` ở thư mục gốc repo.

| Biến | Dùng cho | Ví dụ |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Địa chỉ MariaDB | `127.0.0.1`, `3307`, `tiecnha` |
| `DB_USER`, `DB_PASSWORD` | Tài khoản DB của ứng dụng | — |
| `JWT_SECRET` | Khóa ký JWT, chuỗi ngẫu nhiên dài **≥ 32 ký tự** | — |
| `CORS_ORIGINS` | Domain frontend được phép gọi API, cách nhau bằng dấu phẩy | `https://tiecnha.example.vn` |
| `SPRING_PROFILES_ACTIVE` | `dev` (có dữ liệu demo) hoặc `prod` (không có) | `prod` |
| `PORT` | Cổng backend, mặc định 8080 | `8080` |
| `VITE_API_URL` | URL backend, **được đóng gói vào frontend lúc build** | `https://api.tiecnha.example.vn` |

## Build

```powershell
# Backend: tạo file jar
cd backend
.\mvnw.cmd clean package
java -jar target\tiecnha-backend-0.0.1-SNAPSHOT.jar   # đọc biến môi trường

# Frontend: tạo thư mục web tĩnh
cd frontend
npm ci
$env:VITE_API_URL="https://api.tiecnha.example.vn"; npm run build   # kết quả nằm ở frontend/dist
```

- `frontend/dist` là web tĩnh, đưa lên bất kỳ dịch vụ host tĩnh nào cũng được. Host cần cấu hình chuyển mọi đường dẫn về `index.html` (SPA fallback) để React Router hoạt động.
- Backend cần Java 21 và kết nối được tới MariaDB. Khi khởi động, Flyway tự chạy migration.

## Checklist trước khi lên production

- [ ] `SPRING_PROFILES_ACTIVE=prod` để không nạp tài khoản demo
- [ ] Đặt `JWT_SECRET` và mật khẩu DB mới, mạnh, không trùng bản dev
- [ ] `CORS_ORIGINS` chỉ chứa đúng domain của frontend
- [ ] Bật HTTPS cho cả frontend và backend
- [ ] Tạo tài khoản ADMIN đầu tiên bằng tay (production không có seed)
- [ ] Health check trỏ tới `GET /actuator/health`
- [ ] Ổ đĩa của DB là volume lưu bền vững, có lịch sao lưu

## Lưu dữ liệu bền vững và sao lưu

- Local: dữ liệu nằm ở `.localdb/data/`.
- Server: dùng volume hoặc ổ đĩa riêng cho MariaDB, hoặc dịch vụ DB có sẵn bản sao lưu.
- Sao lưu định kỳ bằng `mariadb-dump` (lệnh mẫu trong [database.md](database.md)). Giữ nhiều bản và thỉnh thoảng thử khôi phục.

## Việc còn thiếu

- Dockerfile cho backend và frontend, cùng `docker-compose.yml` (gồm MariaDB và volume) để chạy cả hệ thống bằng một lệnh.
- Chọn nơi host và tên miền.

Việc đưa web lên Internet chỉ làm khi nhóm đồng ý, **và không tạo tài nguyên trả phí khi chưa được xác nhận**.
