package vn.tiecnha.quote;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.auth.CurrentUser;
import vn.tiecnha.booking.*;
import vn.tiecnha.booking.BookingDtos.BookingDetailDto;
import vn.tiecnha.booking.BookingWorkflow.Actor;
import vn.tiecnha.catalog.PriceUnit;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;
import vn.tiecnha.common.SettingsService;
import vn.tiecnha.payment.PaymentSummary;

@Service
public class QuoteService {
    private final QuoteRepository quotes;
    private final BookingRepository bookings;
    private final BookingService bookingService;
    private final CurrentUser current;
    private final SettingsService settings;
    private final AuditService audit;
    private final Clock clock;

    public QuoteService(QuoteRepository quotes, BookingRepository bookings, BookingService bookingService, CurrentUser current,
                        SettingsService settings, AuditService audit, Clock clock) {
        this.quotes = quotes;
        this.bookings = bookings;
        this.bookingService = bookingService;
        this.current = current;
        this.settings = settings;
        this.audit = audit;
        this.clock = clock;
    }

    public record ItemInput(@NotNull QuoteItem.ItemType itemType,
                            @NotBlank(message = "Nhập mô tả dòng chi phí") @Size(max = 255) String description,
                            @NotNull @Positive(message = "Số lượng phải lớn hơn 0") BigDecimal quantity,
                            @NotBlank(message = "Nhập đơn vị") @Size(max = 30) String unit,
                            @NotNull @PositiveOrZero(message = "Đơn giá không được âm") BigDecimal unitPrice) {}

    public record QuoteInput(@NotEmpty(message = "Báo giá cần ít nhất một dòng") List<@Valid ItemInput> items,
                             @PositiveOrZero BigDecimal depositAmount,
                             @NotNull(message = "Chọn ngày hết hiệu lực") LocalDate validUntil,
                             @Size(max = 1000) String notes,
                             @Size(max = 2000) String terms,
                             boolean send) {}

    /** Goi y cac dong chi phi tu yeu cau cua khach (dung gia da chup luc dat). */
    @Transactional(readOnly = true)
    public QuoteInput suggest(Long bookingId) {
        Booking b = bookings.findWithAllById(bookingId).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        List<ItemInput> items = new ArrayList<>();
        boolean byTable = PriceUnit.TABLE.name().equals(b.getMenuUnitSnapshot());
        int qty = byTable ? b.getTableCount() : b.getGuestCount();
        items.add(new ItemInput(QuoteItem.ItemType.MENU, "Thực đơn " + b.getMenuNameSnapshot(), BigDecimal.valueOf(qty),
                byTable ? "bàn" : "khách", b.getMenuPriceSnapshot()));
        for (BookingAddon a : b.getAddons()) {
            int q = switch (a.getChargeType()) {
                case "PER_GUEST" -> b.getGuestCount();
                case "PER_TABLE" -> b.getTableCount() != null ? b.getTableCount() : (int) Math.ceil(b.getGuestCount() / 10.0);
                default -> a.getQuantity();
            };
            items.add(new ItemInput(QuoteItem.ItemType.ADDON, a.getAddonName(), BigDecimal.valueOf(q), "gói", a.getUnitPrice()));
        }
        items.add(new ItemInput(QuoteItem.ItemType.FEE, "Phí di chuyển & nhân sự phục vụ", BigDecimal.ONE, "gói", new BigDecimal("500000")));
        return new QuoteInput(items, null, LocalDate.now(clock).plusDays(settings.quoteValidDays()), null,
                "Giá đã bao gồm nguyên liệu, nhân sự nấu và phục vụ. Cọc " + settings.depositPercent()
                        + "% để giữ lịch; phần còn lại thanh toán sau tiệc.", false);
    }

    @Transactional
    public BookingDetailDto create(Long bookingId, QuoteInput in) {
        Long uid = current.id();
        Booking b = bookings.lockById(bookingId).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        if (BookingWorkflow.isTerminal(b.getStatus()) || b.getStatus() == BookingStatus.IN_PROGRESS) {
            throw ApiException.conflict("CANNOT_QUOTE", "Đơn đang thực hiện/đã kết thúc, không thể lập báo giá");
        }
        Quote q = new Quote();
        q.setBookingId(b.getId());
        q.setVersionNo(quotes.maxVersion(b.getId()) + 1);
        q.setStatus(QuoteStatus.DRAFT);
        q.setCreatedBy(uid);
        fill(q, in);
        quotes.save(q);
        audit.log(uid, "QUOTE_CREATE", "QUOTE", q.getId(), "booking " + b.getCode() + " v" + q.getVersionNo());
        if (in.send()) doSend(b, q, uid);
        bookings.save(b);
        return bookingService.toDetail(bookings.findWithAllById(bookingId).orElseThrow(), true);
    }

    @Transactional
    public BookingDetailDto updateDraft(Long bookingId, Long quoteId, QuoteInput in) {
        Long uid = current.id();
        Booking b = bookings.lockById(bookingId).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        Quote q = load(bookingId, quoteId);
        if (q.getStatus() != QuoteStatus.DRAFT) {
            throw ApiException.conflict("QUOTE_LOCKED", "Báo giá đã gửi không được sửa. Hãy tạo phiên bản mới.");
        }
        q.getItems().clear();
        fill(q, in);
        quotes.save(q);
        if (in.send()) doSend(b, q, uid);
        bookings.save(b);
        return bookingService.toDetail(bookings.findWithAllById(bookingId).orElseThrow(), true);
    }

    @Transactional
    public BookingDetailDto send(Long bookingId, Long quoteId) {
        Long uid = current.id();
        Booking b = bookings.lockById(bookingId).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        Quote q = load(bookingId, quoteId);
        if (q.getStatus() != QuoteStatus.DRAFT) throw ApiException.conflict("QUOTE_NOT_DRAFT", "Báo giá này đã được gửi");
        doSend(b, q, uid);
        bookings.save(b);
        return bookingService.toDetail(bookings.findWithAllById(bookingId).orElseThrow(), true);
    }

    private void doSend(Booking b, Quote q, Long uid) {
        if (q.getValidUntil().isBefore(LocalDate.now(clock))) {
            throw ApiException.badRequest("QUOTE_EXPIRED", "Ngày hiệu lực phải từ hôm nay trở đi");
        }
        // Ban cu (da gui / da chap nhan) bi thay the; khong sua am tham ban cu
        for (Quote old : quotes.findByBookingIdOrderByVersionNoDesc(b.getId())) {
            if (!old.getId().equals(q.getId()) && (old.getStatus() == QuoteStatus.SENT || old.getStatus() == QuoteStatus.ACCEPTED)) {
                old.setStatus(QuoteStatus.SUPERSEDED);
            }
        }
        b.setAcceptedQuoteId(null);
        q.setStatus(QuoteStatus.SENT);
        q.setSentAt(LocalDateTime.now(clock));
        bookingService.changeStatus(b, BookingStatus.QUOTED, Actor.SYSTEM, uid, "Gửi báo giá phiên bản " + q.getVersionNo());
        audit.log(uid, "QUOTE_SEND", "QUOTE", q.getId(), "v" + q.getVersionNo() + " total " + q.getTotal());
    }

    /** Backend tinh thanh tien va tong, khong tin so lieu tu client. */
    private void fill(Quote q, QuoteInput in) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        int i = 0;
        for (ItemInput it : in.items()) {
            QuoteItem item = new QuoteItem();
            item.setQuote(q);
            item.setItemType(it.itemType());
            item.setDescription(it.description().trim());
            item.setQuantity(it.quantity());
            item.setUnit(it.unit().trim());
            item.setUnitPrice(it.unitPrice());
            BigDecimal amount = it.quantity().multiply(it.unitPrice()).setScale(0, RoundingMode.HALF_UP);
            if (it.itemType() == QuoteItem.ItemType.DISCOUNT) amount = amount.negate();
            else subtotal = subtotal.add(amount);
            item.setAmount(amount);
            item.setSortOrder(i++);
            total = total.add(amount);
            q.getItems().add(item);
        }
        if (total.signum() <= 0) throw ApiException.badRequest("INVALID_TOTAL", "Tổng báo giá phải lớn hơn 0");
        BigDecimal deposit = in.depositAmount() != null ? in.depositAmount().setScale(0, RoundingMode.HALF_UP)
                : total.multiply(BigDecimal.valueOf(settings.depositPercent())).divide(BigDecimal.valueOf(100), -3, RoundingMode.HALF_UP);
        if (deposit.compareTo(total) > 0) throw ApiException.badRequest("DEPOSIT_TOO_LARGE", "Tiền cọc không được lớn hơn tổng tiền");
        q.setSubtotal(subtotal);
        q.setTotal(total);
        q.setDepositAmount(deposit.max(BigDecimal.ZERO).setScale(0, RoundingMode.HALF_UP));
        q.setValidUntil(in.validUntil());
        q.setNotes(in.notes());
        q.setTerms(in.terms());
    }

    private Quote load(Long bookingId, Long quoteId) {
        Quote q = quotes.findWithItemsById(quoteId).orElseThrow(() -> ApiException.notFound("báo giá"));
        if (!q.getBookingId().equals(bookingId)) throw ApiException.notFound("báo giá");
        return q;
    }

    /** Khach chap nhan bao gia con hieu luc. */
    @Transactional
    public BookingDetailDto accept(Long bookingId, Long quoteId) {
        Long uid = current.id();
        Booking b = bookings.lockById(bookingId).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        if (!b.getCustomer().getId().equals(uid)) throw ApiException.notFound("đơn tiệc");
        Quote q = load(bookingId, quoteId);
        if (q.getStatus() != QuoteStatus.SENT) throw ApiException.conflict("QUOTE_NOT_ACTIVE", "Báo giá này không còn áp dụng");
        if (q.getValidUntil().isBefore(LocalDate.now(clock))) {
            throw ApiException.conflict("QUOTE_EXPIRED", "Báo giá đã hết hiệu lực, vui lòng liên hệ để nhận báo giá mới");
        }
        if (b.getStatus() != BookingStatus.QUOTED) throw ApiException.conflict("INVALID_TRANSITION", "Đơn không ở trạng thái chờ chấp nhận báo giá");
        q.setStatus(QuoteStatus.ACCEPTED);
        q.setAcceptedAt(LocalDateTime.now(clock));
        q.setAcceptedBy(uid);
        quotes.saveAndFlush(q);
        b.setAcceptedQuoteId(q.getId());
        PaymentSummary s = bookingService.refreshPaymentStatus(b);
        if (s.netPaid().compareTo(q.getDepositAmount()) >= 0) {
            bookingService.changeStatus(b, BookingStatus.CONFIRMED, Actor.SYSTEM, uid,
                    "Khách chấp nhận báo giá v" + q.getVersionNo() + " (đã đủ cọc)");
        } else {
            bookingService.changeStatus(b, BookingStatus.AWAITING_DEPOSIT, Actor.SYSTEM, uid,
                    "Khách chấp nhận báo giá v" + q.getVersionNo());
        }
        bookings.save(b);
        audit.log(uid, "QUOTE_ACCEPT", "QUOTE", q.getId(), "v" + q.getVersionNo());
        return bookingService.toDetail(bookings.findWithAllById(bookingId).orElseThrow(), false);
    }
}
