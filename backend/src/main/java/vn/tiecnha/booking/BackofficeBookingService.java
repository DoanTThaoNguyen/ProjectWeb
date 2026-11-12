package vn.tiecnha.booking;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.assignment.Assignment;
import vn.tiecnha.assignment.AssignmentRepository;
import vn.tiecnha.assignment.AssignmentTaskStatus;
import vn.tiecnha.auth.CurrentUser;
import vn.tiecnha.booking.BookingDtos.BookingDetailDto;
import vn.tiecnha.booking.BookingDtos.BookingSummaryDto;
import vn.tiecnha.booking.BookingWorkflow.Actor;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;
import vn.tiecnha.common.PageResponse;
import vn.tiecnha.quote.Quote;
import vn.tiecnha.quote.QuoteRepository;

/** Nghiep vu cua dieu phoi / admin tren don tiec: tim kiem, chuyen trang thai, huy, xu ly yeu cau huy. */
@Service
public class BackofficeBookingService {
    /** Duoc bat dau thuc hien som nhat bao nhieu gio truoc gio khai tiec. */
    public static final int START_WINDOW_HOURS = 24;

    private final BookingRepository bookings;
    private final BookingService bookingService;
    private final QuoteRepository quotes;
    private final AssignmentRepository assignments;
    private final CurrentUser current;
    private final AuditService audit;
    private final Clock clock;

    public BackofficeBookingService(BookingRepository bookings, BookingService bookingService, QuoteRepository quotes,
                                    AssignmentRepository assignments, CurrentUser current, AuditService audit, Clock clock) {
        this.bookings = bookings;
        this.bookingService = bookingService;
        this.quotes = quotes;
        this.assignments = assignments;
        this.current = current;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingSummaryDto> search(String q, BookingStatus status, LocalDate from, LocalDate to, Boolean cancelRequested,
                                                  String sort, int page, int size) {
        Sort s = switch (sort == null ? "" : sort) {
            case "start_asc" -> Sort.by("startTime").ascending();
            case "start_desc" -> Sort.by("startTime").descending();
            default -> Sort.by("createdAt").descending();
        };
        var p = bookings.search(q == null || q.isBlank() ? null : q.trim(), status,
                from == null ? null : from.atStartOfDay(), to == null ? null : to.plusDays(1).atStartOfDay(),
                Boolean.TRUE.equals(cancelRequested) ? Boolean.TRUE : null,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), s.and(Sort.by("id").descending())));
        List<Long> qids = p.getContent().stream().map(Booking::getAcceptedQuoteId).filter(Objects::nonNull).toList();
        Map<Long, BigDecimal> totals = quotes.findAllById(qids).stream().collect(Collectors.toMap(Quote::getId, Quote::getTotal));
        return PageResponse.of(p, b -> bookingService.summary(b, b.getAcceptedQuoteId() == null ? null : totals.get(b.getAcceptedQuoteId())));
    }

    /** action: TO_CONSULTING | START | COMPLETE */
    @Transactional
    public BookingDetailDto action(Long id, String action, String note) {
        Long uid = current.id();
        Booking b = bookings.lockById(id).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        String n = note == null || note.isBlank() ? null : note.trim();
        switch (action) {
            case "TO_CONSULTING" -> bookingService.changeStatus(b, BookingStatus.CONSULTING, Actor.BACKOFFICE, uid,
                    n != null ? n : "Điều phối tiếp nhận và tư vấn");
            case "START" -> {
                if (b.getStatus() == BookingStatus.CONFIRMED) {
                    LocalDateTime now = LocalDateTime.now(clock);
                    if (now.isBefore(b.getStartTime().minusHours(START_WINDOW_HOURS))) {
                        throw ApiException.conflict("TOO_EARLY", "Chỉ bắt đầu thực hiện trong vòng " + START_WINDOW_HOURS + " giờ trước giờ khai tiệc");
                    }
                    bookingService.refreshAssignmentStatus(b);
                    if (b.getAssignmentStatus() == AssignmentStatus.UNASSIGNED) {
                        throw ApiException.conflict("NO_STAFF", "Cần phân công nhân sự trước khi bắt đầu thực hiện");
                    }
                }
                bookingService.changeStatus(b, BookingStatus.IN_PROGRESS, Actor.BACKOFFICE, uid, n != null ? n : "Bắt đầu thực hiện tiệc");
            }
            case "COMPLETE" -> bookingService.changeStatus(b, BookingStatus.COMPLETED, Actor.BACKOFFICE, uid,
                    n != null ? n : "Điều phối xác nhận hoàn tất tiệc");
            default -> throw ApiException.badRequest("UNKNOWN_ACTION", "Thao tác không hợp lệ");
        }
        bookings.save(b);
        return bookingService.toDetail(bookings.findWithAllById(id).orElseThrow(), true);
    }

    /** Dieu phoi huy don (thuong do khach gui yeu cau huy). Khong tu coi la da hoan tien. */
    @Transactional
    public BookingDetailDto cancel(Long id, String reason) {
        Long uid = current.id();
        Booking b = bookings.lockById(id).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        String r = reason.trim();
        bookingService.changeStatus(b, BookingStatus.CANCELLED, Actor.BACKOFFICE, uid,
                (b.isCancelRequested() ? "Chấp nhận yêu cầu hủy của khách: " : "Điều phối hủy đơn: ") + r);
        if (b.getCancelReason() == null) b.setCancelReason(r);
        else if (!b.getCancelReason().equals(r)) b.setCancelReason(b.getCancelReason() + " | Xử lý: " + r);
        b.setCancelledBy(uid);
        b.setCancelledAt(LocalDateTime.now(clock));
        // Giai phong lich nhan vien: huy cac phan cong chua hoan thanh
        for (Assignment a : assignments.findByBookingIdOrderByShiftStart(b.getId())) {
            if (a.getStatus() != AssignmentTaskStatus.DONE && a.getStatus() != AssignmentTaskStatus.CANCELLED) {
                a.setStatus(AssignmentTaskStatus.CANCELLED);
            }
        }
        assignments.flush();
        bookingService.refreshAssignmentStatus(b);
        bookings.save(b);
        return bookingService.toDetail(bookings.findWithAllById(id).orElseThrow(), true);
    }

    @Transactional
    public BookingDetailDto rejectCancelRequest(Long id, String note) {
        Long uid = current.id();
        Booking b = bookings.lockById(id).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        if (!b.isCancelRequested() || b.getStatus() == BookingStatus.CANCELLED) {
            throw ApiException.conflict("NO_CANCEL_REQUEST", "Đơn không có yêu cầu hủy đang chờ xử lý");
        }
        b.setCancelRequested(false);
        String n = note == null || note.isBlank() ? "Không có ghi chú" : note.trim();
        bookingService.recordHistory(b.getId(), b.getStatus(), b.getStatus(), uid,
                "Từ chối yêu cầu hủy (lý do khách: " + b.getCancelReason() + "). Phản hồi: " + n);
        b.setCancelReason(null);
        audit.log(uid, "BOOKING_CANCEL_REJECT", "BOOKING", b.getId(), n);
        bookings.save(b);
        return bookingService.toDetail(bookings.findWithAllById(id).orElseThrow(), true);
    }
}
