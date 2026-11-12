package vn.tiecnha.coord;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import vn.tiecnha.assignment.AssignmentService;
import vn.tiecnha.assignment.AssignmentService.*;
import vn.tiecnha.booking.BackofficeBookingService;
import vn.tiecnha.booking.BookingDtos.BookingDetailDto;
import vn.tiecnha.booking.BookingDtos.BookingSummaryDto;
import vn.tiecnha.booking.BookingDtos.CancelRequest;
import vn.tiecnha.booking.BookingRepository;
import vn.tiecnha.booking.BookingService;
import vn.tiecnha.booking.BookingStatus;
import vn.tiecnha.booking.BookingWorkflow;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.PageResponse;
import vn.tiecnha.payment.PaymentService;
import vn.tiecnha.quote.QuoteService;
import vn.tiecnha.quote.QuoteService.QuoteInput;
import vn.tiecnha.report.DashboardService;
import vn.tiecnha.staff.Skill;
import vn.tiecnha.staff.StaffService;
import vn.tiecnha.staff.StaffService.StaffDto;

/** API cho dieu phoi (COORDINATOR) va ADMIN. Quyen duoc chan o SecurityConfig: /api/coord/** */
@RestController
@RequestMapping("/api/coord")
public class CoordController {
    private final BackofficeBookingService backoffice;
    private final BookingService bookingService;
    private final BookingRepository bookingRepo;
    private final QuoteService quotes;
    private final PaymentService payments;
    private final AssignmentService assignments;
    private final StaffService staff;
    private final DashboardService dashboard;

    public CoordController(BackofficeBookingService backoffice, BookingService bookingService, BookingRepository bookingRepo,
                           QuoteService quotes, PaymentService payments, AssignmentService assignments, StaffService staff,
                           DashboardService dashboard) {
        this.backoffice = backoffice;
        this.bookingService = bookingService;
        this.bookingRepo = bookingRepo;
        this.quotes = quotes;
        this.payments = payments;
        this.assignments = assignments;
        this.staff = staff;
        this.dashboard = dashboard;
    }

    // ---------- Don tiec ----------

    @GetMapping("/bookings")
    public PageResponse<BookingSummaryDto> list(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) BookingStatus status,
                                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                @RequestParam(required = false) Boolean cancelRequested,
                                                @RequestParam(required = false) String sort,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "10") int size) {
        return backoffice.search(q, status, from, to, cancelRequested, sort, page, size);
    }

    @GetMapping("/bookings/{id}")
    public BookingDetailDto detail(@PathVariable Long id) {
        return bookingService.detail(id);
    }

    public record ActionInput(@NotBlank String action, @Size(max = 500) String note) {}

    /** action: TO_CONSULTING | START | COMPLETE */
    @PostMapping("/bookings/{id}/actions")
    public BookingDetailDto action(@PathVariable Long id, @Valid @RequestBody ActionInput in) {
        return backoffice.action(id, in.action(), in.note());
    }

    @PostMapping("/bookings/{id}/cancel")
    public BookingDetailDto cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest in) {
        return backoffice.cancel(id, in.reason());
    }

    public record NoteInput(@Size(max = 500) String note) {}

    @PostMapping("/bookings/{id}/cancel-request/reject")
    public BookingDetailDto rejectCancel(@PathVariable Long id, @Valid @RequestBody NoteInput in) {
        return backoffice.rejectCancelRequest(id, in.note());
    }

    @GetMapping("/workflow")
    public List<BookingWorkflow.Rule> workflow() {
        return BookingWorkflow.RULES;
    }

    // ---------- Bao gia ----------

    @GetMapping("/bookings/{id}/quotes/suggest")
    public QuoteInput suggest(@PathVariable Long id) {
        return quotes.suggest(id);
    }

    @PostMapping("/bookings/{id}/quotes")
    public BookingDetailDto createQuote(@PathVariable Long id, @Valid @RequestBody QuoteInput in) {
        return quotes.create(id, in);
    }

    @PutMapping("/bookings/{id}/quotes/{quoteId}")
    public BookingDetailDto updateQuote(@PathVariable Long id, @PathVariable Long quoteId, @Valid @RequestBody QuoteInput in) {
        return quotes.updateDraft(id, quoteId, in);
    }

    @PostMapping("/bookings/{id}/quotes/{quoteId}/send")
    public BookingDetailDto sendQuote(@PathVariable Long id, @PathVariable Long quoteId) {
        return quotes.send(id, quoteId);
    }

    // ---------- Thanh toan ----------

    @PostMapping("/bookings/{id}/payments")
    public BookingDetailDto recordPayment(@PathVariable Long id, @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                          @Valid @RequestBody PaymentService.PaymentInput in) {
        return payments.record(id, key, in);
    }

    // ---------- Phan cong ----------

    @GetMapping("/bookings/{id}/default-shift")
    public DefaultShift defaultShift(@PathVariable Long id) {
        return assignments.defaultShift(bookingRepo.findById(id).orElseThrow(() -> ApiException.notFound("đơn tiệc")));
    }

    @GetMapping("/bookings/{id}/staff-suggestions")
    public List<Suggestion> suggestions(@PathVariable Long id, @RequestParam(required = false) Skill skill) {
        return assignments.suggest(id, skill);
    }

    @PostMapping("/bookings/{id}/assignments")
    public BookingDetailDto assign(@PathVariable Long id, @Valid @RequestBody AssignInput in) {
        return assignments.assign(id, in);
    }

    @PutMapping("/assignments/{assignmentId}")
    public BookingDetailDto updateAssignment(@PathVariable Long assignmentId, @Valid @RequestBody UpdateInput in) {
        return assignments.update(assignmentId, in);
    }

    @PostMapping("/assignments/{assignmentId}/cancel")
    public BookingDetailDto cancelAssignment(@PathVariable Long assignmentId) {
        return assignments.cancel(assignmentId);
    }

    @GetMapping("/schedule")
    public List<AssignmentDto> schedule(@RequestParam @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                        @RequestParam(required = false) Long staffId,
                                        @RequestParam(defaultValue = "false") boolean includeCancelled) {
        return assignments.calendar(from, to, staffId, includeCancelled);
    }

    @GetMapping("/staff")
    public List<StaffDto> staffList() {
        return staff.list();
    }

    // ---------- Thong ke ----------

    @GetMapping("/dashboard")
    public DashboardService.Dashboard dashboard(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return dashboard.build(from, to);
    }
}
