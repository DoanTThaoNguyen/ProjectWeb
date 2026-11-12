package vn.tiecnha.booking;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.assignment.Assignment;
import vn.tiecnha.assignment.AssignmentRepository;
import vn.tiecnha.assignment.AssignmentTaskStatus;
import vn.tiecnha.auth.CurrentUser;
import vn.tiecnha.auth.Role;
import vn.tiecnha.auth.User;
import vn.tiecnha.auth.UserRepository;
import vn.tiecnha.booking.BookingDtos.*;
import vn.tiecnha.booking.BookingWorkflow.Actor;
import vn.tiecnha.catalog.*;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;
import vn.tiecnha.common.SettingsService;
import vn.tiecnha.payment.Payment;
import vn.tiecnha.payment.PaymentRepository;
import vn.tiecnha.payment.PaymentSummary;
import vn.tiecnha.quote.Quote;
import vn.tiecnha.quote.QuoteDto;
import vn.tiecnha.quote.QuoteRepository;
import vn.tiecnha.quote.QuoteStatus;

@Service
public class BookingService {
    private static final SecureRandom RND = new SecureRandom();
    private static final int MAX_DURATION_HOURS = 12;

    private final BookingRepository bookings;
    private final MenuRepository menus;
    private final PartyServiceRepository services;
    private final AddonRepository addons;
    private final StatusHistoryRepository history;
    private final QuoteRepository quotes;
    private final PaymentRepository payments;
    private final AssignmentRepository assignments;
    private final UserRepository users;
    private final CurrentUser current;
    private final SettingsService settings;
    private final AuditService audit;
    private final Clock clock;

    public BookingService(BookingRepository bookings, MenuRepository menus, PartyServiceRepository services,
                          AddonRepository addons, StatusHistoryRepository history, QuoteRepository quotes,
                          PaymentRepository payments, AssignmentRepository assignments, UserRepository users,
                          CurrentUser current, SettingsService settings, AuditService audit, Clock clock) {
        this.bookings = bookings;
        this.menus = menus;
        this.services = services;
        this.addons = addons;
        this.history = history;
        this.quotes = quotes;
        this.payments = payments;
        this.assignments = assignments;
        this.users = users;
        this.current = current;
        this.settings = settings;
        this.audit = audit;
        this.clock = clock;
    }

    // ---------- Tinh gia ----------

    @Transactional(readOnly = true)
    public PriceCalculator.Estimate estimate(EstimateRequest r) {
        Menu menu = menus.findById(r.menuId()).orElseThrow(() -> ApiException.notFound("thực đơn"));
        return PriceCalculator.estimate(menu, r.guestCount(), r.tableCount(), resolveAddons(r.addons()));
    }

    private List<PriceCalculator.AddonChoice> resolveAddons(List<AddonSelection> sel) {
        if (sel == null || sel.isEmpty()) return List.of();
        Map<Long, Integer> qty = new LinkedHashMap<>();
        sel.forEach(s -> qty.merge(s.addonId(), s.quantity(), Integer::sum));
        Map<Long, Addon> found = addons.findAllById(qty.keySet()).stream().collect(Collectors.toMap(Addon::getId, Function.identity()));
        List<PriceCalculator.AddonChoice> out = new ArrayList<>();
        qty.forEach((id, q) -> {
            Addon a = found.get(id);
            if (a == null || !a.isActive()) throw ApiException.badRequest("ADDON_UNAVAILABLE", "Dịch vụ bổ sung không còn cung cấp");
            out.add(new PriceCalculator.AddonChoice(a, q));
        });
        return out;
    }

    // ---------- Khach tao yeu cau ----------

    @Transactional
    public BookingDetailDto create(CreateBookingRequest r) {
        User customer = current.get();
        if (customer.getRole() != Role.CUSTOMER) {
            throw ApiException.forbidden("Chỉ tài khoản khách hàng được gửi yêu cầu đặt tiệc");
        }
        PartyService svc = services.findById(r.serviceId()).orElseThrow(() -> ApiException.notFound("loại tiệc"));
        Menu menu = menus.findById(r.menuId()).orElseThrow(() -> ApiException.notFound("thực đơn"));
        if (!svc.isActive()) throw ApiException.badRequest("SERVICE_INACTIVE", "Loại tiệc này đang tạm ngừng");
        if (!menu.isActive()) throw ApiException.badRequest("MENU_INACTIVE", "Thực đơn đã ngừng phục vụ, vui lòng chọn thực đơn khác");
        if (!menu.getService().getId().equals(svc.getId())) {
            throw ApiException.badRequest("MENU_SERVICE_MISMATCH", "Thực đơn không thuộc loại tiệc đã chọn");
        }
        validateTime(r.startTime(), r.endTime());
        if (r.guestCount() < svc.getMinGuests()) {
            throw ApiException.badRequest("NOT_ENOUGH_GUESTS", svc.getName() + " áp dụng từ " + svc.getMinGuests() + " khách");
        }
        List<PriceCalculator.AddonChoice> chosen = resolveAddons(r.addons());
        PriceCalculator.Estimate est = PriceCalculator.estimate(menu, r.guestCount(), r.tableCount(), chosen);

        Booking b = new Booking();
        b.setCode(newCode());
        b.setCustomer(customer);
        b.setContactName(r.contactName().trim());
        b.setContactPhone(r.contactPhone().trim());
        b.setService(svc);
        b.setMenu(menu);
        b.setStartTime(r.startTime().withSecond(0).withNano(0));
        b.setEndTime(r.endTime().withSecond(0).withNano(0));
        b.setAddress(r.address().trim());
        b.setGuestCount(r.guestCount());
        b.setTableCount(est.tableCount());
        b.setBudget(r.budget());
        b.setNote(r.note() == null || r.note().isBlank() ? null : r.note().trim());
        b.setMenuNameSnapshot(menu.getName());
        b.setMenuPriceSnapshot(menu.getPrice());
        b.setMenuUnitSnapshot(menu.getPriceUnit().name());
        b.setEstimatedTotal(est.total());
        for (PriceCalculator.AddonChoice c : chosen) {
            BookingAddon ba = new BookingAddon();
            ba.setAddonId(c.addon().getId());
            ba.setAddonName(c.addon().getName());
            ba.setQuantity(c.addon().getChargeType() == Addon.ChargeType.FIXED ? c.quantity() : 1);
            ba.setUnitPrice(c.addon().getPrice());
            ba.setChargeType(c.addon().getChargeType().name());
            b.getAddons().add(ba);
        }
        b.setStatus(BookingStatus.NEW);
        bookings.save(b);
        recordHistory(b.getId(), null, BookingStatus.NEW, customer.getId(), "Khách gửi yêu cầu đặt tiệc");
        audit.log(customer.getId(), "BOOKING_CREATE", "BOOKING", b.getId(), b.getCode());
        return toDetail(b, false);
    }

    void validateTime(LocalDateTime start, LocalDateTime end) {
        LocalDateTime now = LocalDateTime.now(clock);
        if (!start.isAfter(now)) throw ApiException.badRequest("TIME_IN_PAST", "Thời gian bắt đầu phải ở tương lai");
        int lead = settings.minLeadHours();
        if (start.isBefore(now.plusHours(lead))) {
            throw ApiException.badRequest("TOO_SOON", "Vui lòng đặt trước ít nhất " + lead + " giờ");
        }
        if (!end.isAfter(start)) throw ApiException.badRequest("INVALID_TIME", "Giờ kết thúc phải sau giờ bắt đầu");
        if (end.isAfter(start.plusHours(MAX_DURATION_HOURS))) {
            throw ApiException.badRequest("TOO_LONG", "Thời lượng tiệc tối đa " + MAX_DURATION_HOURS + " giờ");
        }
        if (start.isAfter(now.plusYears(1))) throw ApiException.badRequest("TOO_FAR", "Chỉ nhận đặt trong vòng 12 tháng");
    }

    private String newCode() {
        String prefix = "TN" + LocalDate.now(clock).format(DateTimeFormatter.ofPattern("yyMMdd"));
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        for (int i = 0; i < 20; i++) {
            StringBuilder sb = new StringBuilder(prefix);
            for (int k = 0; k < 4; k++) sb.append(alphabet.charAt(RND.nextInt(alphabet.length())));
            if (!bookings.existsByCode(sb.toString())) return sb.toString();
        }
        throw new IllegalStateException("Khong sinh duoc ma don");
    }

    // ---------- Khach xem / huy ----------

    @Transactional(readOnly = true)
    public List<BookingSummaryDto> myBookings() {
        Long uid = current.id();
        Map<Long, BigDecimal> quoted = new HashMap<>();
        List<Booking> list = bookings.findByCustomerIdOrderByCreatedAtDesc(uid);
        for (Booking b : list) {
            if (b.getAcceptedQuoteId() != null) quotes.findById(b.getAcceptedQuoteId()).ifPresent(q -> quoted.put(b.getId(), q.getTotal()));
        }
        return list.stream().map(b -> summary(b, quoted.get(b.getId()))).toList();
    }

    /** Chi tiet don: khach chi xem don cua minh; dieu phoi/admin xem tat ca. */
    @Transactional(readOnly = true)
    public BookingDetailDto detail(Long id) {
        Booking b = bookings.findWithAllById(id).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        boolean backOffice = current.isBackOffice();
        if (!backOffice && !b.getCustomer().getId().equals(current.id())) {
            // Khong tiet lo su ton tai cua don nguoi khac
            throw ApiException.notFound("đơn tiệc");
        }
        return toDetail(b, backOffice);
    }

    @Transactional
    public BookingDetailDto customerCancel(Long id, String reason) {
        Long uid = current.id();
        Booking b = bookings.lockById(id).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        if (!b.getCustomer().getId().equals(uid)) throw ApiException.notFound("đơn tiệc");
        BookingStatus s = b.getStatus();
        if (BookingWorkflow.allowed(s, BookingStatus.CANCELLED, Actor.CUSTOMER)) {
            b.setCancelReason(reason.trim());
            b.setCancelledBy(uid);
            b.setCancelledAt(LocalDateTime.now(clock));
            changeStatus(b, BookingStatus.CANCELLED, Actor.CUSTOMER, uid, "Khách hủy: " + reason.trim());
        } else if (s == BookingStatus.AWAITING_DEPOSIT || s == BookingStatus.CONFIRMED) {
            if (b.isCancelRequested()) throw ApiException.conflict("ALREADY_REQUESTED", "Bạn đã gửi yêu cầu hủy, vui lòng chờ điều phối xử lý");
            b.setCancelRequested(true);
            b.setCancelReason(reason.trim());
            audit.log(uid, "BOOKING_CANCEL_REQUEST", "BOOKING", b.getId(), reason.trim());
        } else {
            throw ApiException.conflict("CANNOT_CANCEL", "Đơn ở trạng thái hiện tại không thể hủy");
        }
        bookings.save(b);
        return toDetail(bookings.findWithAllById(id).orElseThrow(), false);
    }

    // ---------- Dung chung cho cac module khac ----------

    /** Chuyen trang thai theo bang BookingWorkflow; nem loi neu khong hop le. */
    public void changeStatus(Booking b, BookingStatus to, Actor actor, Long userId, String note) {
        BookingStatus from = b.getStatus();
        if (!BookingWorkflow.allowed(from, to, actor)) {
            throw ApiException.conflict("INVALID_TRANSITION",
                    "Không thể chuyển đơn từ '" + label(from) + "' sang '" + label(to) + "'");
        }
        b.setStatus(to);
        recordHistory(b.getId(), from, to, userId, note);
        audit.log(userId, "BOOKING_STATUS", "BOOKING", b.getId(), from + " -> " + to);
    }

    public void recordHistory(Long bookingId, BookingStatus from, BookingStatus to, Long userId, String note) {
        StatusHistory h = new StatusHistory();
        h.setBookingId(bookingId);
        h.setFromStatus(from);
        h.setToStatus(to);
        h.setChangedBy(userId);
        h.setNote(note);
        h.setCreatedAt(LocalDateTime.now(clock));
        history.save(h);
    }

    /** Cap nhat payment_status tu cac giao dich. */
    public PaymentSummary refreshPaymentStatus(Booking b) {
        Quote q = b.getAcceptedQuoteId() == null ? null : quotes.findById(b.getAcceptedQuoteId()).orElse(null);
        List<Payment> ps = payments.findByBookingIdOrderByPaidAtAscIdAsc(b.getId());
        PaymentSummary s = PaymentSummary.of(q == null ? null : q.getTotal(), q == null ? null : q.getDepositAmount(), ps);
        PaymentStatus st;
        if (s.refunded().signum() > 0) st = PaymentStatus.REFUNDED;
        else if (s.paid().signum() == 0) st = PaymentStatus.UNPAID;
        else if (s.total() != null && s.netPaid().compareTo(s.total()) >= 0) st = PaymentStatus.PAID;
        else st = PaymentStatus.DEPOSIT_PAID;
        b.setPaymentStatus(st);
        return s;
    }

    /** Cap nhat assignment_status tu cac phan cong (bo qua phan cong da huy). */
    public void refreshAssignmentStatus(Booking b) {
        List<Assignment> list = assignments.findByBookingIdOrderByShiftStart(b.getId()).stream()
                .filter(a -> a.getStatus() != AssignmentTaskStatus.CANCELLED).toList();
        if (list.isEmpty()) b.setAssignmentStatus(AssignmentStatus.UNASSIGNED);
        else if (list.stream().allMatch(a -> a.getStatus() == AssignmentTaskStatus.DONE)) b.setAssignmentStatus(AssignmentStatus.DONE);
        else b.setAssignmentStatus(AssignmentStatus.ASSIGNED);
    }

    public BookingSummaryDto summary(Booking b, BigDecimal quotedTotal) {
        return new BookingSummaryDto(b.getId(), b.getCode(), b.getService().getName(), b.getMenuNameSnapshot(), b.getStartTime(),
                b.getEndTime(), b.getAddress(), b.getGuestCount(), b.getTableCount(), b.getEstimatedTotal(), quotedTotal,
                b.getStatus().name(), b.getPaymentStatus().name(), b.getAssignmentStatus().name(), b.isCancelRequested(),
                b.getContactName(), b.getContactPhone(), b.getCustomer().getEmail(), b.getCreatedAt(), b.getMenu().getImage());
    }

    public BookingDetailDto toDetail(Booking b, boolean backOffice) {
        LocalDate today = LocalDate.now(clock);
        List<Quote> qs = quotes.findByBookingIdOrderByVersionNoDesc(b.getId()).stream()
                .filter(q -> backOffice || q.getStatus() != QuoteStatus.DRAFT).toList();
        Quote accepted = qs.stream().filter(q -> q.getId().equals(b.getAcceptedQuoteId())).findFirst().orElse(null);
        List<Payment> ps = payments.findByBookingIdOrderByPaidAtAscIdAsc(b.getId());
        Set<Long> userIds = new HashSet<>();
        List<StatusHistory> hs = history.findByBookingIdOrderByCreatedAtAscIdAsc(b.getId());
        hs.forEach(h -> { if (h.getChangedBy() != null) userIds.add(h.getChangedBy()); });
        ps.forEach(p -> userIds.add(p.getRecordedBy()));
        Map<Long, String> names = users.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, User::getFullName));

        List<AssignmentLite> asg = backOffice
                ? assignments.findByBookingIdOrderByShiftStart(b.getId()).stream().map(a -> new AssignmentLite(a.getId(),
                        a.getStaff().getId(), a.getStaff().getFullName(), a.getStaff().getPhone(), a.getTaskRole().name(), a.getTask(),
                        a.getShiftStart(), a.getShiftEnd(), a.getStatus().name(), a.getNote())).toList()
                : List.of();

        return new BookingDetailDto(
                summary(b, accepted == null ? null : accepted.getTotal()),
                b.getCustomer().getId(), b.getCustomer().getFullName(), b.getService().getId(), b.getMenu().getId(),
                b.getMenu().getSlug(), b.getMenuPriceSnapshot(), b.getMenuUnitSnapshot(), b.getBudget(), b.getNote(),
                b.getAddons().stream().map(a -> new AddonLine(a.getAddonId(), a.getAddonName(), a.getQuantity(), a.getUnitPrice(),
                        a.getChargeType())).toList(),
                b.getCancelReason(), b.getCancelledAt(),
                hs.stream().map(h -> new HistoryDto(h.getFromStatus() == null ? null : h.getFromStatus().name(), h.getToStatus().name(),
                        h.getChangedBy() == null ? null : names.get(h.getChangedBy()), h.getNote(), h.getCreatedAt())).toList(),
                qs.stream().map(q -> QuoteDto.of(q, today)).toList(),
                b.getAcceptedQuoteId(),
                ps.stream().map(p -> new PaymentDto(p.getId(), p.getType().name(), p.getAmount(), p.getMethod().name(), p.getReferenceCode(),
                        p.getPaidAt(), names.get(p.getRecordedBy()), p.getNote())).toList(),
                PaymentSummary.of(accepted == null ? null : accepted.getTotal(), accepted == null ? null : accepted.getDepositAmount(), ps),
                asg,
                allowedActions(b, backOffice, qs, today));
    }

    private List<String> allowedActions(Booking b, boolean backOffice, List<Quote> qs, LocalDate today) {
        List<String> a = new ArrayList<>();
        BookingStatus s = b.getStatus();
        if (!backOffice) {
            if (BookingWorkflow.allowed(s, BookingStatus.CANCELLED, Actor.CUSTOMER)) a.add("CANCEL");
            if ((s == BookingStatus.AWAITING_DEPOSIT || s == BookingStatus.CONFIRMED) && !b.isCancelRequested()) a.add("REQUEST_CANCEL");
            if (s == BookingStatus.QUOTED && qs.stream().anyMatch(q -> q.getStatus() == QuoteStatus.SENT && !q.getValidUntil().isBefore(today))) {
                a.add("ACCEPT_QUOTE");
            }
            return a;
        }
        if (BookingWorkflow.allowed(s, BookingStatus.CONSULTING, Actor.BACKOFFICE)) a.add("TO_CONSULTING");
        if (BookingWorkflow.allowed(s, BookingStatus.QUOTED, Actor.SYSTEM)) a.add("QUOTE");
        if (BookingWorkflow.allowed(s, BookingStatus.IN_PROGRESS, Actor.BACKOFFICE)) a.add("START");
        if (BookingWorkflow.allowed(s, BookingStatus.COMPLETED, Actor.BACKOFFICE)) a.add("COMPLETE");
        if (BookingWorkflow.allowed(s, BookingStatus.CANCELLED, Actor.BACKOFFICE)) a.add("CANCEL");
        if (b.getAcceptedQuoteId() != null && s != BookingStatus.CANCELLED) a.add("RECORD_PAYMENT");
        boolean hasPaid = payments.findByBookingIdOrderByPaidAtAscIdAsc(b.getId()).stream().anyMatch(p -> p.getType() != Payment.Type.REFUND);
        if (hasPaid) a.add("RECORD_REFUND");
        if (b.isCancelRequested() && s != BookingStatus.CANCELLED) a.add("HANDLE_CANCEL_REQUEST");
        if (s == BookingStatus.CONFIRMED || s == BookingStatus.IN_PROGRESS || s == BookingStatus.AWAITING_DEPOSIT) a.add("ASSIGN");
        return a;
    }

    public static String label(BookingStatus s) {
        return switch (s) {
            case NEW -> "Yêu cầu mới";
            case CONSULTING -> "Đang tư vấn";
            case QUOTED -> "Đã gửi báo giá";
            case AWAITING_DEPOSIT -> "Chờ cọc";
            case CONFIRMED -> "Đã xác nhận";
            case IN_PROGRESS -> "Đang thực hiện";
            case COMPLETED -> "Hoàn tất";
            case CANCELLED -> "Đã hủy";
        };
    }
}
