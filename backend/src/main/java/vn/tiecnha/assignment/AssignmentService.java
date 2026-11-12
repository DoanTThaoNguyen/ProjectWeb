package vn.tiecnha.assignment;

import jakarta.validation.constraints.*;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.auth.CurrentUser;
import vn.tiecnha.booking.*;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;
import vn.tiecnha.common.SettingsService;
import vn.tiecnha.staff.Skill;
import vn.tiecnha.staff.Staff;
import vn.tiecnha.staff.StaffRepository;

/**
 * Phan cong nhan su va chong trung lich.
 * Ca lam = [gio khai tiec - phut chuan bi, gio ket thuc + phut thu don] (co the chinh tay).
 * Hai ca giao nhau khi startA < endB va startB < endA; phan cong da huy bi bo qua.
 * Chong 2 yeu cau dong thoi: khoa dong staff (SELECT ... FOR UPDATE) + READ COMMITTED de thay du lieu vua ghi.
 */
@Service
public class AssignmentService {
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final int MAX_SHIFT_HOURS = 18;
    /** Nhan vien duoc bam "Bat dau" som nhat bao nhieu gio truoc gio bat dau ca. */
    static final int STAFF_START_EARLY_HOURS = 3;

    private final AssignmentRepository assignments;
    private final StaffRepository staffRepo;
    private final BookingRepository bookings;
    private final BookingService bookingService;
    private final SettingsService settings;
    private final CurrentUser current;
    private final AuditService audit;
    private final Clock clock;

    public AssignmentService(AssignmentRepository assignments, StaffRepository staffRepo, BookingRepository bookings,
                             BookingService bookingService, SettingsService settings, CurrentUser current, AuditService audit, Clock clock) {
        this.assignments = assignments;
        this.staffRepo = staffRepo;
        this.bookings = bookings;
        this.bookingService = bookingService;
        this.settings = settings;
        this.current = current;
        this.audit = audit;
        this.clock = clock;
    }

    // ---------- DTO ----------

    public record AssignInput(@NotNull(message = "Chọn nhân viên") Long staffId,
                              @NotNull(message = "Chọn vai trò") Skill taskRole,
                              @NotBlank(message = "Nhập nhiệm vụ") @Size(max = 255) String task,
                              LocalDateTime shiftStart, LocalDateTime shiftEnd,
                              @Size(max = 500) String note) {}

    public record UpdateInput(@NotBlank(message = "Nhập nhiệm vụ") @Size(max = 255) String task,
                              @NotNull Skill taskRole,
                              @NotNull(message = "Chọn giờ bắt đầu ca") LocalDateTime shiftStart,
                              @NotNull(message = "Chọn giờ kết thúc ca") LocalDateTime shiftEnd,
                              @Size(max = 500) String note) {}

    public record Conflict(Long assignmentId, Long bookingId, String bookingCode, String task, LocalDateTime shiftStart,
                           LocalDateTime shiftEnd) {}

    public record AssignmentDto(Long id, Long bookingId, String bookingCode, String bookingStatus, String serviceName, String menuName,
                                String address, String contactName, String contactPhone, int guestCount, Integer tableCount,
                                LocalDateTime partyStart, LocalDateTime partyEnd, Long staffId, String staffName, String staffPhone,
                                String taskRole, String task, LocalDateTime shiftStart, LocalDateTime shiftEnd, String status,
                                String note, String bookingNote, List<Teammate> teammates, List<String> nextStatuses) {}

    public record Teammate(String name, String phone, String taskRole, String task) {}

    public record Suggestion(Long staffId, String fullName, String phone, List<String> skills, boolean hasSkill, boolean free,
                             List<Conflict> conflicts, long shiftsThisWeek, boolean alreadyOnBooking) {}

    public record DefaultShift(LocalDateTime shiftStart, LocalDateTime shiftEnd, int prepMinutes, int teardownMinutes) {}

    // ---------- Dieu phoi ----------

    public DefaultShift defaultShift(Booking b) {
        int prep = settings.prepMinutes();
        int tear = settings.teardownMinutes();
        return new DefaultShift(b.getStartTime().minusMinutes(prep), b.getEndTime().plusMinutes(tear), prep, tear);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingDtos.BookingDetailDto assign(Long bookingId, AssignInput in) {
        Long uid = current.id();
        Booking b = bookings.lockById(bookingId).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        if (b.getStatus() != BookingStatus.AWAITING_DEPOSIT && b.getStatus() != BookingStatus.CONFIRMED
                && b.getStatus() != BookingStatus.IN_PROGRESS) {
            throw ApiException.conflict("CANNOT_ASSIGN", "Chỉ phân công cho đơn đã chấp nhận báo giá (chờ cọc / đã xác nhận / đang thực hiện)");
        }
        DefaultShift d = defaultShift(b);
        LocalDateTime start = (in.shiftStart() == null ? d.shiftStart() : in.shiftStart()).withSecond(0).withNano(0);
        LocalDateTime end = (in.shiftEnd() == null ? d.shiftEnd() : in.shiftEnd()).withSecond(0).withNano(0);
        validateShift(b, start, end);

        Staff s = staffRepo.lockById(in.staffId()).orElseThrow(() -> ApiException.notFound("nhân viên"));
        if (!s.isActive()) throw ApiException.conflict("STAFF_INACTIVE", "Nhân viên " + s.getFullName() + " đang ngừng hoạt động");
        if (!s.getSkills().contains(in.taskRole())) {
            throw ApiException.badRequest("SKILL_MISMATCH", "Nhân viên " + s.getFullName() + " không có kỹ năng phù hợp với vai trò này");
        }
        ensureNoOverlap(s, start, end, null);

        Assignment a = new Assignment();
        a.setBooking(b);
        a.setStaff(s);
        a.setTaskRole(in.taskRole());
        a.setTask(in.task().trim());
        a.setShiftStart(start);
        a.setShiftEnd(end);
        a.setNote(blank(in.note()));
        a.setStatus(AssignmentTaskStatus.ASSIGNED);
        a.setCreatedBy(uid);
        assignments.saveAndFlush(a);
        bookingService.refreshAssignmentStatus(b);
        bookings.save(b);
        audit.log(uid, "ASSIGN", "ASSIGNMENT", a.getId(), b.getCode() + " -> " + s.getFullName() + " " + start + "~" + end);
        return bookingService.toDetail(bookings.findWithAllById(bookingId).orElseThrow(), true);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingDtos.BookingDetailDto update(Long assignmentId, UpdateInput in) {
        Long uid = current.id();
        Assignment a = assignments.findById(assignmentId).orElseThrow(() -> ApiException.notFound("phân công"));
        Booking b = bookings.lockById(a.getBooking().getId()).orElseThrow();
        if (a.getStatus() == AssignmentTaskStatus.CANCELLED || a.getStatus() == AssignmentTaskStatus.DONE) {
            throw ApiException.conflict("ASSIGNMENT_CLOSED", "Phân công đã kết thúc, không thể sửa");
        }
        LocalDateTime start = in.shiftStart().withSecond(0).withNano(0);
        LocalDateTime end = in.shiftEnd().withSecond(0).withNano(0);
        validateShift(b, start, end);
        Staff s = staffRepo.lockById(a.getStaff().getId()).orElseThrow();
        if (!s.getSkills().contains(in.taskRole())) {
            throw ApiException.badRequest("SKILL_MISMATCH", "Nhân viên " + s.getFullName() + " không có kỹ năng phù hợp với vai trò này");
        }
        ensureNoOverlap(s, start, end, a.getId());
        a.setTask(in.task().trim());
        a.setTaskRole(in.taskRole());
        a.setShiftStart(start);
        a.setShiftEnd(end);
        a.setNote(blank(in.note()));
        assignments.save(a);
        audit.log(uid, "ASSIGN_UPDATE", "ASSIGNMENT", a.getId(), start + "~" + end);
        return bookingService.toDetail(bookings.findWithAllById(b.getId()).orElseThrow(), true);
    }

    @Transactional
    public BookingDtos.BookingDetailDto cancel(Long assignmentId) {
        Long uid = current.id();
        Assignment a = assignments.findById(assignmentId).orElseThrow(() -> ApiException.notFound("phân công"));
        Booking b = bookings.lockById(a.getBooking().getId()).orElseThrow();
        if (a.getStatus() == AssignmentTaskStatus.DONE) throw ApiException.conflict("ASSIGNMENT_DONE", "Nhiệm vụ đã hoàn thành, không thể hủy");
        if (a.getStatus() == AssignmentTaskStatus.CANCELLED) throw ApiException.conflict("ASSIGNMENT_CANCELLED", "Phân công đã được hủy trước đó");
        a.setStatus(AssignmentTaskStatus.CANCELLED);
        assignments.saveAndFlush(a);
        bookingService.refreshAssignmentStatus(b);
        bookings.save(b);
        audit.log(uid, "ASSIGN_CANCEL", "ASSIGNMENT", a.getId(), b.getCode() + " " + a.getStaff().getFullName());
        return bookingService.toDetail(bookings.findWithAllById(b.getId()).orElseThrow(), true);
    }

    private void validateShift(Booking b, LocalDateTime start, LocalDateTime end) {
        if (!end.isAfter(start)) throw ApiException.badRequest("INVALID_SHIFT", "Giờ kết thúc ca phải sau giờ bắt đầu ca");
        if (Duration.between(start, end).toHours() > MAX_SHIFT_HOURS) {
            throw ApiException.badRequest("SHIFT_TOO_LONG", "Một ca làm tối đa " + MAX_SHIFT_HOURS + " giờ");
        }
        if (!(start.isBefore(b.getEndTime()) && b.getStartTime().isBefore(end))) {
            throw ApiException.badRequest("SHIFT_OUTSIDE_PARTY", "Ca làm phải bao gồm một phần thời gian diễn ra tiệc");
        }
    }

    private void ensureNoOverlap(Staff s, LocalDateTime start, LocalDateTime end, Long excludeId) {
        List<Assignment> overlaps = assignments.findOverlaps(s.getId(), start, end, excludeId);
        if (overlaps.isEmpty()) return;
        List<Conflict> cs = overlaps.stream().map(this::conflict).toList();
        Conflict c = cs.get(0);
        throw ApiException.conflict("SCHEDULE_CONFLICT",
                "Nhân viên " + s.getFullName() + " đã có ca ở tiệc " + c.bookingCode() + " từ " + c.shiftStart().format(HM)
                        + " đến " + c.shiftEnd().format(HM) + " (giao với ca " + start.format(HM) + " – " + end.format(HM) + ")",
                cs);
    }

    private Conflict conflict(Assignment o) {
        return new Conflict(o.getId(), o.getBooking().getId(), o.getBooking().getCode(), o.getTask(), o.getShiftStart(), o.getShiftEnd());
    }

    /** Goi y nhan vien: co ky nang + ranh trong ca mac dinh + it ca trong tuan duoc uu tien. */
    @Transactional(readOnly = true)
    public List<Suggestion> suggest(Long bookingId, Skill skill) {
        Booking b = bookings.findWithAllById(bookingId).orElseThrow(() -> ApiException.notFound("đơn tiệc"));
        DefaultShift d = defaultShift(b);
        LocalDate day = b.getStartTime().toLocalDate();
        LocalDateTime weekFrom = day.minusDays(day.getDayOfWeek().getValue() - 1L).atStartOfDay();
        Map<Long, Long> weekLoad = assignments.findActiveInRange(weekFrom, weekFrom.plusDays(7)).stream()
                .collect(Collectors.groupingBy(a -> a.getStaff().getId(), Collectors.counting()));
        Set<Long> onBooking = assignments.findByBookingIdOrderByShiftStart(bookingId).stream()
                .filter(a -> a.getStatus() != AssignmentTaskStatus.CANCELLED).map(a -> a.getStaff().getId()).collect(Collectors.toSet());
        List<Suggestion> out = new ArrayList<>();
        for (Staff s : staffRepo.findByActiveTrueOrderByFullName()) {
            boolean has = skill == null || s.getSkills().contains(skill);
            List<Conflict> cs = assignments.findOverlaps(s.getId(), d.shiftStart(), d.shiftEnd(), null).stream().map(this::conflict).toList();
            out.add(new Suggestion(s.getId(), s.getFullName(), s.getPhone(), s.getSkills().stream().map(Enum::name).sorted().toList(), has,
                    cs.isEmpty(), cs, weekLoad.getOrDefault(s.getId(), 0L), onBooking.contains(s.getId())));
        }
        out.sort(Comparator.comparing(Suggestion::hasSkill).reversed()
                .thenComparing(Comparator.comparing(Suggestion::free).reversed())
                .thenComparing(Suggestion::shiftsThisWeek)
                .thenComparing(Suggestion::fullName));
        return out;
    }

    /** Lich phan cong theo khoang ngay (dieu phoi). */
    @Transactional(readOnly = true)
    public List<AssignmentDto> calendar(LocalDate from, LocalDate to, Long staffId, boolean includeCancelled) {
        if (to.isBefore(from)) throw ApiException.badRequest("INVALID_RANGE", "Khoảng ngày không hợp lệ");
        if (from.plusDays(62).isBefore(to)) throw ApiException.badRequest("RANGE_TOO_LONG", "Chỉ xem tối đa 62 ngày");
        return assignments.findInRange(from.atStartOfDay(), to.plusDays(1).atStartOfDay(), staffId).stream()
                .filter(a -> includeCancelled || a.getStatus() != AssignmentTaskStatus.CANCELLED)
                .map(a -> toDto(a, false)).toList();
    }

    // ---------- Nhan vien ----------

    private Staff me() {
        return staffRepo.findByUserId(current.id())
                .orElseThrow(() -> ApiException.forbidden("Tài khoản chưa được liên kết với hồ sơ nhân viên"));
    }

    @Transactional(readOnly = true)
    public List<AssignmentDto> mine(LocalDate from, LocalDate to) {
        Staff s = me();
        LocalDate f = from == null ? LocalDate.now(clock).minusDays(30) : from;
        LocalDate t = to == null ? LocalDate.now(clock).plusDays(60) : to;
        if (t.isBefore(f) || f.plusDays(120).isBefore(t)) throw ApiException.badRequest("INVALID_RANGE", "Khoảng ngày không hợp lệ");
        return assignments.findInRange(f.atStartOfDay(), t.plusDays(1).atStartOfDay(), s.getId()).stream()
                .map(a -> toDto(a, true)).toList();
    }

    @Transactional(readOnly = true)
    public AssignmentDto myOne(Long id) {
        Staff s = me();
        Assignment a = assignments.findWithAllById(id).orElseThrow(() -> ApiException.notFound("công việc"));
        if (!a.getStaff().getId().equals(s.getId())) throw ApiException.notFound("công việc");
        return toDto(a, true);
    }

    /** Luong cho phep cua nhan vien: ASSIGNED -> CONFIRMED -> IN_PROGRESS -> DONE (tung buoc). */
    static final Map<AssignmentTaskStatus, AssignmentTaskStatus> STAFF_FLOW = Map.of(
            AssignmentTaskStatus.ASSIGNED, AssignmentTaskStatus.CONFIRMED,
            AssignmentTaskStatus.CONFIRMED, AssignmentTaskStatus.IN_PROGRESS,
            AssignmentTaskStatus.IN_PROGRESS, AssignmentTaskStatus.DONE);

    @Transactional
    public AssignmentDto updateMyStatus(Long id, AssignmentTaskStatus to) {
        Staff s = me();
        Assignment a = assignments.findWithAllById(id).orElseThrow(() -> ApiException.notFound("công việc"));
        // Khong tiet lo phan cong cua nguoi khac
        if (!a.getStaff().getId().equals(s.getId())) throw ApiException.notFound("công việc");
        Booking b = bookings.lockById(a.getBooking().getId()).orElseThrow();
        if (b.getStatus() == BookingStatus.CANCELLED) throw ApiException.conflict("BOOKING_CANCELLED", "Tiệc đã hủy");
        if (STAFF_FLOW.get(a.getStatus()) != to) {
            throw ApiException.conflict("INVALID_TASK_TRANSITION", "Không thể chuyển công việc từ '" + taskLabel(a.getStatus())
                    + "' sang '" + taskLabel(to) + "'");
        }
        if ((to == AssignmentTaskStatus.IN_PROGRESS || to == AssignmentTaskStatus.DONE)
                && b.getStatus() != BookingStatus.CONFIRMED && b.getStatus() != BookingStatus.IN_PROGRESS) {
            throw ApiException.conflict("BOOKING_NOT_CONFIRMED", "Tiệc chưa được xác nhận (chưa nhận cọc) nên chưa thể bắt đầu công việc");
        }
        LocalDateTime now = LocalDateTime.now(clock);
        if (to == AssignmentTaskStatus.IN_PROGRESS && now.isBefore(a.getShiftStart().minusHours(STAFF_START_EARLY_HOURS))) {
            throw ApiException.conflict("SHIFT_NOT_STARTED", "Chưa đến ca làm (bắt đầu " + a.getShiftStart().format(HM)
                    + "). Chỉ bấm 'Bắt đầu' sớm nhất " + STAFF_START_EARLY_HOURS + " giờ trước ca.");
        }
        if (to == AssignmentTaskStatus.DONE && now.isBefore(a.getShiftStart())) {
            throw ApiException.conflict("SHIFT_NOT_STARTED", "Chưa đến giờ bắt đầu ca nên chưa thể báo hoàn thành");
        }
        a.setStatus(to);
        assignments.saveAndFlush(a);
        // Hoan thanh nhiem vu ca nhan KHONG tu hoan tat ca don; chi cap nhat trang thai phan cong tong hop
        bookingService.refreshAssignmentStatus(b);
        bookings.save(b);
        audit.log(current.id(), "TASK_" + to, "ASSIGNMENT", a.getId(), b.getCode());
        return toDto(a, true);
    }

    static String taskLabel(AssignmentTaskStatus s) {
        return switch (s) {
            case ASSIGNED -> "Được giao";
            case CONFIRMED -> "Đã nhận việc";
            case IN_PROGRESS -> "Đang làm";
            case DONE -> "Hoàn thành";
            case CANCELLED -> "Đã hủy";
        };
    }

    private AssignmentDto toDto(Assignment a, boolean forStaff) {
        Booking b = a.getBooking();
        List<Teammate> mates = forStaff
                ? assignments.findByBookingIdOrderByShiftStart(b.getId()).stream()
                        .filter(o -> !o.getId().equals(a.getId()) && o.getStatus() != AssignmentTaskStatus.CANCELLED)
                        .map(o -> new Teammate(o.getStaff().getFullName(), o.getStaff().getPhone(), o.getTaskRole().name(), o.getTask()))
                        .toList()
                : List.of();
        AssignmentTaskStatus next = STAFF_FLOW.get(a.getStatus());
        boolean bookingOk = b.getStatus() != BookingStatus.CANCELLED;
        return new AssignmentDto(a.getId(), b.getId(), b.getCode(), b.getStatus().name(), b.getService().getName(), b.getMenuNameSnapshot(),
                b.getAddress(), b.getContactName(), b.getContactPhone(), b.getGuestCount(), b.getTableCount(), b.getStartTime(), b.getEndTime(),
                a.getStaff().getId(), a.getStaff().getFullName(), a.getStaff().getPhone(), a.getTaskRole().name(), a.getTask(),
                a.getShiftStart(), a.getShiftEnd(), a.getStatus().name(), a.getNote(), forStaff ? b.getNote() : null, mates,
                next != null && bookingOk ? List.of(next.name()) : List.of());
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
