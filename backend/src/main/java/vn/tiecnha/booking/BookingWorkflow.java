package vn.tiecnha.booking;

import static vn.tiecnha.booking.BookingStatus.*;

import java.util.List;
import java.util.Set;

/**
 * Bang chuyen trang thai don tiec. Backend chan moi buoc nhay khong co trong bang.
 *
 * Actor:
 *  - CUSTOMER   : khach so huu don
 *  - BACKOFFICE : dieu phoi (COORDINATOR) hoac ADMIN, thao tac tay
 *  - SYSTEM     : chuyen tu dong do mot nghiep vu khac (gui bao gia, chap nhan bao gia, ghi nhan coc)
 */
public final class BookingWorkflow {
    private BookingWorkflow() {}

    public enum Actor { CUSTOMER, BACKOFFICE, SYSTEM }

    public record Rule(Set<BookingStatus> from, BookingStatus to, Set<Actor> actors, String trigger, String condition) {}

    public static final List<Rule> RULES = List.of(
            new Rule(Set.of(NEW), CONSULTING, Set.of(Actor.BACKOFFICE),
                    "Điều phối tiếp nhận", "—"),
            new Rule(Set.of(NEW, CONSULTING, QUOTED, AWAITING_DEPOSIT, CONFIRMED), QUOTED, Set.of(Actor.SYSTEM),
                    "Điều phối gửi báo giá (bản mới)", "Báo giá hợp lệ; bản cũ chuyển 'Đã thay thế'"),
            new Rule(Set.of(QUOTED), AWAITING_DEPOSIT, Set.of(Actor.SYSTEM),
                    "Khách chấp nhận báo giá", "Báo giá đang gửi và còn hiệu lực; tiền cọc > số đã thu"),
            new Rule(Set.of(QUOTED), CONFIRMED, Set.of(Actor.SYSTEM),
                    "Khách chấp nhận báo giá", "Tiền cọc yêu cầu = 0 hoặc đã thu đủ cọc"),
            new Rule(Set.of(AWAITING_DEPOSIT), CONFIRMED, Set.of(Actor.SYSTEM),
                    "Ghi nhận thanh toán", "Tổng đã thu ≥ tiền cọc yêu cầu"),
            new Rule(Set.of(CONFIRMED), IN_PROGRESS, Set.of(Actor.BACKOFFICE),
                    "Điều phối bắt đầu thực hiện", "Trong vòng 24 giờ trước giờ khai tiệc"),
            new Rule(Set.of(IN_PROGRESS), COMPLETED, Set.of(Actor.BACKOFFICE),
                    "Điều phối hoàn tất đơn", "Không tự hoàn tất khi nhân viên xong nhiệm vụ"),
            new Rule(Set.of(NEW, CONSULTING, QUOTED), CANCELLED, Set.of(Actor.CUSTOMER, Actor.BACKOFFICE),
                    "Hủy đơn", "Khách hủy trực tiếp trước khi chấp nhận báo giá; bắt buộc lý do"),
            new Rule(Set.of(AWAITING_DEPOSIT, CONFIRMED), CANCELLED, Set.of(Actor.BACKOFFICE),
                    "Điều phối hủy (thường do khách gửi yêu cầu hủy)", "Bắt buộc lý do; không tự coi là đã hoàn tiền")
    );

    public static boolean allowed(BookingStatus from, BookingStatus to, Actor actor) {
        return RULES.stream().anyMatch(r -> r.from().contains(from) && r.to() == to && r.actors().contains(actor));
    }

    public static boolean isTerminal(BookingStatus s) {
        return s == COMPLETED || s == CANCELLED;
    }
}
