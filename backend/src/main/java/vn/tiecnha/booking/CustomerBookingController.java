package vn.tiecnha.booking;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.tiecnha.booking.BookingDtos.*;
import vn.tiecnha.quote.QuoteService;

/** API cho khach hang: tinh gia, gui yeu cau, xem don cua minh, chap nhan bao gia, huy. */
@RestController
public class CustomerBookingController {
    private final BookingService service;
    private final QuoteService quotes;

    public CustomerBookingController(BookingService service, QuoteService quotes) {
        this.service = service;
        this.quotes = quotes;
    }

    /** Gia tam tinh (cong khai, khong luu). */
    @PostMapping("/api/public/estimate")
    public PriceCalculator.Estimate estimate(@Valid @RequestBody EstimateRequest r) {
        return service.estimate(r);
    }

    @PostMapping("/api/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDetailDto create(@Valid @RequestBody CreateBookingRequest r) {
        return service.create(r);
    }

    @GetMapping("/api/bookings/my")
    public List<BookingSummaryDto> mine() {
        return service.myBookings();
    }

    @GetMapping("/api/bookings/{id}")
    public BookingDetailDto detail(@PathVariable Long id) {
        return service.detail(id);
    }

    @PostMapping("/api/bookings/{id}/cancel")
    public BookingDetailDto cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest r) {
        return service.customerCancel(id, r.reason());
    }

    @PostMapping("/api/bookings/{id}/quotes/{quoteId}/accept")
    public BookingDetailDto accept(@PathVariable Long id, @PathVariable Long quoteId) {
        return quotes.accept(id, quoteId);
    }

    @GetMapping("/api/public/workflow")
    public List<BookingWorkflow.Rule> workflow() {
        return BookingWorkflow.RULES;
    }
}
