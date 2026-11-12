package vn.tiecnha.report;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.common.ApiException;

/**
 * Thong ke. Quy tac (xem docs/workflows.md):
 *  - Gia tri don (orderValue): tong bao gia DA CHAP NHAN cua cac don co NGAY TO CHUC trong ky, tru don da huy.
 *  - Doanh thu tiec hoan tat (completedRevenue): nhu tren nhung chi don COMPLETED.
 *  - Tien da thu (collected): tong giao dich DEPOSIT + BALANCE co NGAY GIAO DICH trong ky.
 *  - Tien da hoan (refunded): tong giao dich REFUND co NGAY GIAO DICH trong ky.
 *  - Con phai thu (receivable): voi cac don co NGAY TO CHUC trong ky (chua huy): bao gia chap nhan - (da thu - da hoan) moi thoi diem.
 *  - Coc chi duoc tinh mot lan trong "tien da thu"; khong cong voi gia tri don.
 */
@Service
public class DashboardService {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public DashboardService(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public record Point(String label, BigDecimal orderValue, BigDecimal collected, long events) {}

    public record Upcoming(Long id, String code, String serviceName, String contactName, LocalDateTime startTime, LocalDateTime endTime,
                           String address, int guestCount, String status, String paymentStatus, String assignmentStatus, long staffCount) {}

    public record Dashboard(LocalDate from, LocalDate to, long newRequests, long pendingNew, long pendingCancelRequests,
                            long awaitingDeposit, long eventsInRange, Map<String, Long> statusCounts,
                            BigDecimal orderValue, BigDecimal completedRevenue, BigDecimal collected, BigDecimal depositCollected,
                            BigDecimal balanceCollected, BigDecimal refunded, BigDecimal netCollected, BigDecimal receivable,
                            String granularity, List<Point> series, List<Upcoming> upcoming) {}

    @Transactional(readOnly = true)
    public Dashboard build(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) throw ApiException.badRequest("INVALID_RANGE", "Ngày kết thúc phải sau ngày bắt đầu");
        if (ChronoUnit.DAYS.between(from, to) > 366 * 2) throw ApiException.badRequest("RANGE_TOO_LONG", "Khoảng thời gian tối đa 2 năm");
        Timestamp f = Timestamp.valueOf(from.atStartOfDay());
        Timestamp t = Timestamp.valueOf(to.plusDays(1).atStartOfDay());

        long newRequests = count("SELECT COUNT(*) FROM bookings WHERE created_at >= ? AND created_at < ?", f, t);
        long pendingNew = count("SELECT COUNT(*) FROM bookings WHERE status = 'NEW'");
        long pendingCancel = count("SELECT COUNT(*) FROM bookings WHERE cancel_requested = TRUE AND status <> 'CANCELLED'");
        long awaitingDeposit = count("SELECT COUNT(*) FROM bookings WHERE status = 'AWAITING_DEPOSIT'");

        Map<String, Long> statusCounts = new LinkedHashMap<>();
        for (String s : List.of("NEW", "CONSULTING", "QUOTED", "AWAITING_DEPOSIT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED")) {
            statusCounts.put(s, 0L);
        }
        jdbc.query("SELECT status, COUNT(*) FROM bookings WHERE start_time >= ? AND start_time < ? GROUP BY status",
                rs -> { statusCounts.put(rs.getString(1), rs.getLong(2)); }, f, t);
        long events = statusCounts.values().stream().mapToLong(Long::longValue).sum();

        String acceptedJoin = " FROM bookings b JOIN quotes q ON q.id = b.accepted_quote_id WHERE b.start_time >= ? AND b.start_time < ? ";
        BigDecimal orderValue = sum("SELECT SUM(q.total)" + acceptedJoin + "AND b.status <> 'CANCELLED'", f, t);
        BigDecimal completedRevenue = sum("SELECT SUM(q.total)" + acceptedJoin + "AND b.status = 'COMPLETED'", f, t);
        BigDecimal deposit = sum("SELECT SUM(amount) FROM payments WHERE type = 'DEPOSIT' AND paid_at >= ? AND paid_at < ?", f, t);
        BigDecimal balance = sum("SELECT SUM(amount) FROM payments WHERE type = 'BALANCE' AND paid_at >= ? AND paid_at < ?", f, t);
        BigDecimal refunded = sum("SELECT SUM(amount) FROM payments WHERE type = 'REFUND' AND paid_at >= ? AND paid_at < ?", f, t);
        BigDecimal collected = deposit.add(balance);
        BigDecimal receivable = sum("""
                SELECT SUM(GREATEST(q.total - COALESCE(p.net, 0), 0))
                FROM bookings b JOIN quotes q ON q.id = b.accepted_quote_id
                LEFT JOIN (SELECT booking_id, SUM(CASE WHEN type = 'REFUND' THEN -amount ELSE amount END) AS net
                           FROM payments GROUP BY booking_id) p ON p.booking_id = b.id
                WHERE b.start_time >= ? AND b.start_time < ? AND b.status <> 'CANCELLED'
                """, f, t);

        boolean daily = ChronoUnit.DAYS.between(from, to) <= 62;
        String fmt = daily ? "%Y-%m-%d" : "%Y-%m";
        Map<String, Point> series = new TreeMap<>();
        for (LocalDate d = daily ? from : from.withDayOfMonth(1); !d.isAfter(to); d = daily ? d.plusDays(1) : d.plusMonths(1)) {
            String k = daily ? d.toString() : d.toString().substring(0, 7);
            series.put(k, new Point(k, BigDecimal.ZERO, BigDecimal.ZERO, 0));
        }
        jdbc.query("SELECT DATE_FORMAT(b.start_time, '" + fmt + "') k, SUM(q.total), COUNT(*)" + acceptedJoin
                + "AND b.status <> 'CANCELLED' GROUP BY k", rs -> {
            Point p = series.get(rs.getString(1));
            if (p != null) series.put(p.label(), new Point(p.label(), rs.getBigDecimal(2), p.collected(), rs.getLong(3)));
        }, f, t);
        jdbc.query("SELECT DATE_FORMAT(paid_at, '" + fmt + "') k, SUM(CASE WHEN type = 'REFUND' THEN -amount ELSE amount END) "
                + "FROM payments WHERE paid_at >= ? AND paid_at < ? GROUP BY k", rs -> {
            Point p = series.get(rs.getString(1));
            if (p != null) series.put(p.label(), new Point(p.label(), p.orderValue(), rs.getBigDecimal(2), p.events()));
        }, f, t);

        LocalDateTime now = LocalDateTime.now(clock);
        List<Upcoming> upcoming = jdbc.query("""
                SELECT b.id, b.code, s.name, b.contact_name, b.start_time, b.end_time, b.address, b.guest_count, b.status,
                       b.payment_status, b.assignment_status,
                       (SELECT COUNT(*) FROM assignments a WHERE a.booking_id = b.id AND a.status <> 'CANCELLED')
                FROM bookings b JOIN party_services s ON s.id = b.service_id
                WHERE b.end_time >= ? AND b.start_time < ? AND b.status IN ('AWAITING_DEPOSIT', 'CONFIRMED', 'IN_PROGRESS')
                ORDER BY b.start_time LIMIT 20
                """, (rs, i) -> new Upcoming(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getTimestamp(5).toLocalDateTime(), rs.getTimestamp(6).toLocalDateTime(), rs.getString(7), rs.getInt(8),
                rs.getString(9), rs.getString(10), rs.getString(11), rs.getLong(12)), Timestamp.valueOf(now), Timestamp.valueOf(now.plusDays(14)));

        return new Dashboard(from, to, newRequests, pendingNew, pendingCancel, awaitingDeposit, events, statusCounts, orderValue,
                completedRevenue, collected, deposit, balance, refunded, collected.subtract(refunded), receivable,
                daily ? "day" : "month", new ArrayList<>(series.values()), upcoming);
    }

    private long count(String sql, Object... args) {
        Long n = jdbc.queryForObject(sql, Long.class, args);
        return n == null ? 0 : n;
    }

    private BigDecimal sum(String sql, Object... args) {
        BigDecimal v = jdbc.queryForObject(sql, BigDecimal.class, args);
        return v == null ? BigDecimal.ZERO : v;
    }
}
