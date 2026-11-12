package vn.tiecnha.payment;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.auth.CurrentUser;
import vn.tiecnha.booking.*;
import vn.tiecnha.booking.BookingDtos.BookingDetailDto;
import vn.tiecnha.booking.BookingWorkflow.Actor;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;
import vn.tiecnha.quote.Quote;
import vn.tiecnha.quote.QuoteRepository;

/**
 * Ghi nhan thanh toan thu cong (khong tich hop cong thanh toan, khong tao giao dich ngan hang).
 * Chong ghi trung: moi lan bam "Ghi nhan" client gui Idempotency-Key; cot idempotency_key UNIQUE trong DB.
 */
@Service
public class PaymentService {
    private final PaymentRepository payments;
    private final BookingRepository bookings;
    private final QuoteRepository quotes;
    private final BookingService bookingService;
    private final CurrentUser current;
    private final AuditService audit;
    private final Clock clock;

    public PaymentService(PaymentRepository payments, BookingRepository bookings, QuoteRepository quotes, BookingService bookingService,
                          CurrentUser current, AuditService audit, Clock clock) {
        this.payments = payments;
        this.bookings = bookings;
        this.quotes = quotes;
        this.bookingService = bookingService;
        this.current = current;
        this.audit = audit;
        this.clock = clock;
    }

    public record PaymentInput(@NotNull(message = "Chọn loại giao dịch") Payment.Type type,
                               @NotNull(message = "Nhập số tiền") @Positive(message = "Số tiền phải lớn hơn 0")
                               @Digits(integer = 13, fraction = 0, message = "Số tiền không hợp lệ") BigDecimal amount,
                               @NotNull(message = "Chọn phương thức") Payment.Method method,
                               @Size(max = 100) String referenceCode,
                               LocalDateTime paidAt,
                               @Size(max = 500) String note) {}

    @Transactional
    public BookingDetailDto record(Long bookingId, String idemKey, PaymentInput in) {
        if (idemKey == null || idemKey.isBlank() || idemKey.length() > 80) {
            throw ApiException.badRequest("IDEMPOTENCY_KEY_REQUIRED", "Thiếu khóa chống ghi trùng (Idempotency-Key)");
        }
        Long uid = current.id();
        // Khoa don truoc -> hai yeu cau cung luc cho cung mot don phai xep hang
        Booking b = bookings.lockById(bookingId).orElseThrow(() -> ApiException.notFound("đơn tiệc"));

        var existing = payments.findByIdempotencyKey(idemKey);
        if (existing.isPresent()) {
            if (!existing.get().getBookingId().equals(bookingId)) {
                throw ApiException.conflict("IDEMPOTENCY_KEY_REUSED", "Khóa chống ghi trùng đã dùng cho đơn khác");
            }
            // Bam lap lai: tra ve ket qua cu, khong ghi them
            return bookingService.toDetail(bookings.findWithAllById(bookingId).orElseThrow(), true);
        }

        Quote q = b.getAcceptedQuoteId() == null ? null : quotes.findById(b.getAcceptedQuoteId()).orElse(null);
        PaymentSummary s = PaymentSummary.of(q == null ? null : q.getTotal(), q == null ? null : q.getDepositAmount(),
                payments.findByBookingIdOrderByPaidAtAscIdAsc(bookingId));
        BigDecimal amount = in.amount().setScale(0, RoundingMode.HALF_UP);
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime paidAt = in.paidAt() == null ? now : in.paidAt();
        if (paidAt.isAfter(now.plusMinutes(5))) throw ApiException.badRequest("PAID_AT_FUTURE", "Thời điểm thanh toán không được ở tương lai");

        if (in.type() == Payment.Type.REFUND) {
            if (amount.compareTo(s.netPaid()) > 0) {
                throw ApiException.badRequest("REFUND_TOO_LARGE", "Số tiền hoàn vượt quá số đã thu thực tế (" + vn.tiecnha.common.Money.vnd(s.netPaid()) + ")");
            }
        } else {
            if (q == null) throw ApiException.conflict("NO_ACCEPTED_QUOTE", "Đơn chưa có báo giá được khách chấp nhận");
            if (b.getStatus() == BookingStatus.CANCELLED) throw ApiException.conflict("BOOKING_CANCELLED", "Đơn đã hủy, chỉ có thể ghi nhận hoàn tiền");
            if (amount.compareTo(s.remaining()) > 0) {
                throw ApiException.badRequest("OVERPAY", "Số tiền vượt quá số còn phải thu (" + vn.tiecnha.common.Money.vnd(s.remaining()) + ")");
            }
        }

        Payment p = new Payment();
        p.setBookingId(bookingId);
        p.setType(in.type());
        p.setAmount(amount);
        p.setMethod(in.method());
        p.setReferenceCode(in.referenceCode() == null || in.referenceCode().isBlank() ? null : in.referenceCode().trim());
        p.setPaidAt(paidAt.withNano(0));
        p.setRecordedBy(uid);
        p.setNote(in.note() == null || in.note().isBlank() ? null : in.note().trim());
        p.setIdempotencyKey(idemKey);
        payments.saveAndFlush(p);

        PaymentSummary after = bookingService.refreshPaymentStatus(b);
        if (b.getStatus() == BookingStatus.AWAITING_DEPOSIT && q != null && after.netPaid().compareTo(q.getDepositAmount()) >= 0) {
            bookingService.changeStatus(b, BookingStatus.CONFIRMED, Actor.SYSTEM, uid, "Đã nhận đủ tiền cọc – xác nhận lịch tiệc");
        }
        bookings.save(b);
        audit.log(uid, "PAYMENT_" + in.type(), "BOOKING", bookingId, amount.toPlainString() + " " + in.method());
        return bookingService.toDetail(bookings.findWithAllById(bookingId).orElseThrow(), true);
    }
}
