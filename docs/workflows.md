# Luồng nghiệp vụ

## 1. Luồng chính

```
Khách gửi yêu cầu → Điều phối tiếp nhận, tư vấn → Gửi báo giá → Khách chấp nhận
→ Ghi nhận cọc → Phân công nhân viên → Nhân viên thực hiện → Điều phối hoàn tất → Thống kê
```

## 2. Trạng thái đơn

`NEW` (Yêu cầu mới) → `CONSULTING` (Đang tư vấn) → `QUOTED` (Đã gửi báo giá) → `AWAITING_DEPOSIT` (Chờ cọc) → `CONFIRMED` (Đã xác nhận) → `IN_PROGRESS` (Đang thực hiện) → `COMPLETED` (Hoàn tất). Đơn cũng có thể chuyển sang `CANCELLED` (Hủy).

Bảng luồng được khai báo trong `BookingWorkflow.java`. Backend chặn mọi bước chuyển không có trong bảng và báo lỗi `INVALID_TRANSITION`. Mỗi lần chuyển đều được ghi vào `booking_status_history`.

Bên thực hiện:
- **Khách:** chủ của đơn.
- **Điều phối:** COORDINATOR hoặc ADMIN, thao tác tay.
- **Hệ thống:** trạng thái tự chuyển khi xảy ra một nghiệp vụ khác.

| Từ | Sang | Ai | Khi nào / Điều kiện |
|---|---|---|---|
| NEW | CONSULTING | Điều phối | Tiếp nhận yêu cầu |
| NEW, CONSULTING, QUOTED, AWAITING_DEPOSIT, CONFIRMED | QUOTED | Hệ thống | Điều phối gửi một bản báo giá mới; bản cũ chuyển sang "Đã thay thế" |
| QUOTED | AWAITING_DEPOSIT | Hệ thống | Khách chấp nhận báo giá còn hiệu lực, và tiền cọc yêu cầu lớn hơn số đã thu |
| QUOTED | CONFIRMED | Hệ thống | Khách chấp nhận báo giá, và tiền cọc yêu cầu bằng 0 hoặc đã thu đủ |
| AWAITING_DEPOSIT | CONFIRMED | Hệ thống | Ghi nhận thanh toán xong và tổng đã thu ≥ tiền cọc |
| CONFIRMED | IN_PROGRESS | Điều phối | Chỉ được làm trong vòng 24 giờ trước giờ khai tiệc |
| IN_PROGRESS | COMPLETED | Điều phối | Nhân viên xong nhiệm vụ thì đơn **không** tự hoàn tất |
| NEW, CONSULTING, QUOTED | CANCELLED | Khách hoặc Điều phối | Bắt buộc ghi lý do |
| AWAITING_DEPOSIT, CONFIRMED | CANCELLED | Điều phối | Thường làm khi khách gửi yêu cầu hủy. Bắt buộc ghi lý do. Hủy **không** đồng nghĩa đã hoàn tiền |

**Hủy đơn (giả định demo):**
- Trước khi chấp nhận báo giá, khách được tự hủy.
- Sau khi đã chấp nhận, khách chỉ gửi được *yêu cầu hủy*. Điều phối sẽ đồng ý (hủy đơn) hoặc từ chối.
- Mỗi lần hủy đều lưu lý do, người xử lý và thời điểm.
- Muốn hoàn tiền thì phải ghi nhận một giao dịch REFUND riêng.

## 3. Báo giá

- Báo giá gồm các dòng: MENU, ADDON, FEE (phí khác), DISCOUNT (giảm giá). Mỗi dòng có số lượng, đơn vị và đơn giá. **Backend tính** thành tiền của từng dòng, tổng tiền và mức cọc mặc định (`deposit_percent`).
- Trạng thái báo giá: `DRAFT` → `SENT` → `ACCEPTED`, hoặc `SUPERSEDED` khi đã có bản mới hơn.
- Báo giá đã gửi hoặc đã chấp nhận thì không sửa trực tiếp được. Muốn thay đổi, điều phối tạo **phiên bản mới**, và khách phải chấp nhận lại.
- Khách chỉ chấp nhận được báo giá đang ở trạng thái SENT và chưa quá `valid_until`.

## 4. Thanh toán

- Trạng thái thanh toán của đơn: `UNPAID` (chưa thu) → `DEPOSIT_PAID` (đã cọc) → `PAID` (đã thu đủ), hoặc `REFUNDED` (đã hoàn).
- Chỉ COORDINATOR và ADMIN được ghi nhận. Có 3 loại giao dịch:
  - DEPOSIT: thu cọc
  - BALANCE: thu phần còn lại
  - REFUND: hoàn tiền
- Các lỗi backend chặn:
  - Ghi thu khi chưa có báo giá được chấp nhận
  - Thu vượt số còn phải thu
  - Hoàn vượt số thực đã thu
  - Thời điểm thanh toán nằm ở tương lai
  - Ghi thu cho đơn đã hủy (đơn đã hủy chỉ được ghi hoàn tiền)
- **Chống ghi trùng:** mỗi lần bấm "Ghi nhận", frontend tạo một `Idempotency-Key` gửi kèm. Nếu gửi lại cùng khóa, backend trả về giao dịch cũ chứ không tạo giao dịch mới.
- Khách bấm nút hay tải ảnh chuyển khoản **không** được tính là đã thu. Hệ thống không tạo giao dịch ngân hàng thật.

## 5. Phân công và chặn trùng lịch

- **Ca làm mặc định** = giờ khai tiệc − `prep_minutes` (180 phút) đến giờ kết thúc + `teardown_minutes` (90 phút). Như vậy ca đã tính cả thời gian chuẩn bị và thu dọn.
- Hai ca A và B **giao nhau** khi `startA < endB` **và** `startB < endA`. Phân công đã hủy không được tính.
- Backend khóa dòng nhân viên trong transaction trước khi kiểm tra. Vì vậy hai người cùng phân công một nhân viên cùng lúc sẽ không cùng lọt qua.
- Khi bị chặn, API trả lỗi `SCHEDULE_CONFLICT`, kèm danh sách nhân viên đang vướng tiệc nào (mã đơn) và trong khoảng giờ nào.
- Chỉ phân công được cho đơn đang ở trạng thái Chờ cọc, Đã xác nhận hoặc Đang thực hiện. Nhân viên phải đang hoạt động.
- **Gợi ý nhân viên:** lọc những người có kỹ năng phù hợp và rảnh trong ca đó.

### Trạng thái nhiệm vụ của nhân viên

`ASSIGNED` (Đã giao) → `CONFIRMED` (Đã nhận việc) → `IN_PROGRESS` (Đang làm) → `DONE` (Hoàn thành). Nhân viên đi lần lượt từng bước. Điều phối có thể chuyển sang `CANCELLED` (Đã hủy).

- Nhân viên chỉ cập nhật được nhiệm vụ của chính mình.
- Chỉ được chuyển sang "Đang làm" khi đơn đã xác nhận (đã nhận cọc), và sớm nhất 3 giờ trước khi bắt đầu ca.
- Chỉ được chuyển sang "Hoàn thành" khi ca đã bắt đầu.

## 6. Quy tắc thống kê (dashboard)

Mỗi chỉ số được tính theo một trong hai loại ngày:
- **Ngày tổ chức:** giờ khai tiệc (`bookings.start_time`)
- **Ngày giao dịch:** thời điểm thanh toán (`payments.paid_at`)

| Chỉ số | Cách tính | Theo ngày |
|---|---|---|
| Yêu cầu mới | Số đơn được tạo trong kỳ | Ngày tạo đơn |
| Số tiệc theo trạng thái | Đếm đơn theo trạng thái | Ngày tổ chức |
| Giá trị đơn | Tổng **báo giá đã chấp nhận**, không tính đơn đã hủy | Ngày tổ chức |
| Doanh thu tiệc hoàn tất | Như giá trị đơn nhưng chỉ tính đơn COMPLETED | Ngày tổ chức |
| Tiền đã thu | Tổng giao dịch DEPOSIT + BALANCE | Ngày giao dịch |
| Tiền đã hoàn | Tổng giao dịch REFUND | Ngày giao dịch |
| Thực thu ròng | Đã thu − Đã hoàn | Ngày giao dịch |
| Còn phải thu | Báo giá đã chấp nhận − (đã thu − đã hoàn), tính trên các đơn chưa hủy | Ngày tổ chức |
| Tiệc sắp diễn ra | Các đơn Chờ cọc, Đã xác nhận, Đang thực hiện trong 14 ngày tới | — |

Nguyên tắc:
- Tổng tiền của mọi yêu cầu **không** phải là doanh thu. Đơn chưa có báo giá được chấp nhận thì không được tính vào giá trị đơn.
- Tiền cọc chỉ nằm trong "Tiền đã thu", **không** cộng thêm vào giá trị đơn.
