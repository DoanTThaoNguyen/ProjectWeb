# Kịch bản demo (khoảng 10–15 phút)

## Chuẩn bị

1. Chạy DB, backend và frontend theo hướng dẫn trong [README](../README.md). Mở http://localhost:5173.
2. Mật khẩu chung của mọi tài khoản demo là `Demo@123`.
3. Nên mở hai trình duyệt, hoặc một cửa sổ thường và một cửa sổ ẩn danh, để đăng nhập hai vai trò cùng lúc.

## Phần 1. Khách đặt tiệc (khach@tiecnha.vn)

1. Ở trang chủ, chỉ ra các dịch vụ (tiệc bàn, buffet, BBQ, teabreak) và nút **Đặt tiệc** nổi bật.
2. Vào **Thực đơn**:
   - Lọc theo hình thức và khoảng giá, tìm theo tên.
   - Mở một thực đơn để xem danh sách món, giá và đơn vị tính (theo bàn hoặc theo khách).
3. Bấm **Đặt tiệc** và đi qua 4 bước:
   - Nhập ngày giờ, địa chỉ, số khách, chọn thêm dịch vụ bổ sung.
   - Chỉ ra **giá tạm tính** và dòng ghi chú "chưa phải báo giá".
   - Thử chọn giờ ở quá khứ hoặc nhập số điện thoại sai để thấy báo lỗi.
4. Xem trang xác nhận rồi bấm **Gửi**. Đơn mới xuất hiện trong **Đơn của tôi** với trạng thái *Yêu cầu mới*.

## Phần 2. Điều phối báo giá (dieuphoi@tiecnha.vn → /quan-tri)

1. Vào **Đơn**, lọc trạng thái *Yêu cầu mới* và mở đơn vừa tạo.
2. Bấm **Tiếp nhận & tư vấn**, đơn chuyển sang *Đang tư vấn*.
3. Bấm **+ Lập báo giá**:
   - Hệ thống gợi ý sẵn các dòng thực đơn và dịch vụ bổ sung.
   - Thêm một dòng phí vận chuyển.
   - Chỉ ra rằng tổng tiền và tiền cọc do backend tính.
4. Bấm **Gửi khách**, đơn chuyển sang *Đã gửi báo giá*.

## Phần 3. Khách chấp nhận

Quay lại tài khoản khách, mở đơn, xem báo giá (các dòng, tổng tiền, tiền cọc, hạn hiệu lực) và bấm **Chấp nhận báo giá**. Đơn chuyển sang *Chờ cọc*.

## Phần 4. Ghi nhận cọc và chặn ghi trùng

1. Với tài khoản điều phối, ở chi tiết đơn, bấm **+ Ghi nhận giao dịch** và chọn loại Cọc. Đơn chuyển sang *Đã xác nhận*.
2. Chỉ ra rằng ghi trùng bị chặn: cùng một lần bấm (cùng `Idempotency-Key`) không tạo thêm giao dịch, và ghi vượt số còn phải thu sẽ bị báo lỗi.

## Phần 5. Phân công và chặn trùng lịch

1. Mở đơn **TNDEMO06**. Đơn này trùng giờ với TNDEMO05, và TNDEMO05 đã có nhân viên.
2. Bấm **+ Phân công**. Danh sách nhân viên được sắp theo gợi ý: đúng kỹ năng, rồi rảnh trong ca, rồi ít ca trong tuần. Người đã vướng lịch có nhãn **Trùng lịch**.
3. Chọn một người đang làm ở TNDEMO05, ví dụ Phạm Văn Tuấn. Backend chặn và báo **trùng lịch**, nêu rõ tiệc TNDEMO05 và khoảng giờ bị vướng.
4. Chọn một người có nhãn **Rảnh**, phân công thành công.
5. Vào **Lịch** để xem lịch phân công theo tuần.

## Phần 6. Nhân viên thực hiện (phucvu.lan@tiecnha.vn → /nhan-vien)

1. Xem danh sách việc và lịch tuần, mở một nhiệm vụ để xem địa điểm, giờ và nhiệm vụ cụ thể.
2. Mở nhiệm vụ ở TNDEMO07. Tiệc này diễn ra hôm nay lúc 18:30, nên ca bắt đầu từ 15:30.
   - Từ 12:30 trở đi mới bấm được **Bắt đầu làm**.
   - Từ 15:30 trở đi mới bấm được **Báo hoàn thành**.
   - Bấm sớm hơn thì backend chặn, và đó cũng là một ý để demo.
3. Nhiệm vụ của Võ Thị Lan ở TNDEMO05 (3 ngày tới) đang ở trạng thái "Đã giao", chỉ bấm được **Nhận việc**.
4. Chỉ ra rằng nhân viên hoàn thành nhiệm vụ thì đơn **không** tự hoàn tất.

## Phần 7. Hoàn tất và thống kê

1. Với tài khoản điều phối, mở TNDEMO07, ghi nhận phần tiền còn lại rồi bấm **Xác nhận hoàn tất**.
2. Mở **Dashboard**, đổi khoảng ngày và chỉ ra:
   - **Giá trị đơn**, **Tiền đã thu**, **Đã hoàn**, **Còn phải thu**, **Doanh thu tiệc hoàn tất**.
   - Ghi chú của từng chỉ số: tính theo ngày tổ chức hay ngày giao dịch.
   - Tiền cọc không bị cộng trùng vào giá trị đơn.

## Phần 8. Phân quyền (tùy chọn)

- Đăng nhập khach2 rồi mở đường dẫn đơn của khach. Backend chặn và trang báo lỗi.
- Tài khoản nhân viên mở `/quan-tri` thì bị chặn.
- Với tài khoản admin, vào **Tài khoản**, khóa một tài khoản. Tài khoản đó không đăng nhập được nữa.
