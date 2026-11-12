package vn.tiecnha.admin;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.auth.*;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;
import vn.tiecnha.common.PageResponse;
import vn.tiecnha.common.SettingsService;
import vn.tiecnha.staff.Staff;
import vn.tiecnha.staff.StaffRepository;

/** Quan tri tai khoan, cau hinh demo, lich su thao tac. */
@Service
public class AdminService {
    private final UserRepository users;
    private final StaffRepository staffRepo;
    private final PasswordEncoder encoder;
    private final CurrentUser current;
    private final AuditService audit;
    private final SettingsService settings;
    private final JdbcTemplate jdbc;

    public AdminService(UserRepository users, StaffRepository staffRepo, PasswordEncoder encoder, CurrentUser current, AuditService audit,
                        SettingsService settings, JdbcTemplate jdbc) {
        this.users = users;
        this.staffRepo = staffRepo;
        this.encoder = encoder;
        this.current = current;
        this.audit = audit;
        this.settings = settings;
        this.jdbc = jdbc;
    }

    public record UserRow(Long id, String email, String phone, String fullName, String role, boolean active, LocalDateTime createdAt,
                          Long staffId) {}

    public record CreateUser(@NotBlank(message = "Nhập email") @Email(message = "Email không hợp lệ") @Size(max = 160) String email,
                             @NotBlank(message = "Nhập họ tên") @Size(max = 120) String fullName,
                             @Pattern(regexp = AuthController.PHONE_REGEX, message = AuthController.PHONE_MSG) String phone,
                             @NotNull(message = "Chọn vai trò") Role role,
                             @NotBlank(message = "Nhập mật khẩu") @Size(min = 8, max = 72, message = "Mật khẩu từ 8 ký tự") String password) {}

    public record UpdateUser(@NotBlank(message = "Nhập họ tên") @Size(max = 120) String fullName,
                             @Pattern(regexp = AuthController.PHONE_REGEX, message = AuthController.PHONE_MSG) String phone,
                             @NotNull Role role, boolean active,
                             @Size(min = 8, max = 72, message = "Mật khẩu từ 8 ký tự") String newPassword) {}

    @Transactional(readOnly = true)
    public PageResponse<UserRow> listUsers(String q, Role role, int page, int size) {
        var p = users.search(q == null || q.isBlank() ? null : q.trim(), role,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending().and(Sort.by("id"))));
        return PageResponse.of(p, this::row);
    }

    private UserRow row(User u) {
        Long sid = u.getRole() == Role.STAFF ? staffRepo.findByUserId(u.getId()).map(Staff::getId).orElse(null) : null;
        return new UserRow(u.getId(), u.getEmail(), u.getPhone(), u.getFullName(), u.getRole().name(), u.isActive(), u.getCreatedAt(), sid);
    }

    @Transactional
    public UserRow create(CreateUser in) {
        String email = in.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("EMAIL_TAKEN", "Email đã được sử dụng");
        User u = new User();
        u.setEmail(email);
        u.setFullName(in.fullName().trim());
        u.setPhone(in.phone() == null || in.phone().isBlank() ? null : in.phone().trim());
        u.setRole(in.role());
        u.setActive(true);
        u.setPasswordHash(encoder.encode(in.password()));
        users.saveAndFlush(u);
        if (in.role() == Role.STAFF) ensureStaffProfile(u);
        audit.log(current.id(), "USER_CREATE", "USER", u.getId(), email + " " + in.role());
        return row(u);
    }

    @Transactional
    public UserRow update(Long id, UpdateUser in) {
        Long me = current.id();
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("tài khoản"));
        if (u.getId().equals(me) && (!in.active() || in.role() != u.getRole())) {
            throw ApiException.conflict("SELF_LOCK", "Không thể tự khóa hoặc tự đổi vai trò của chính mình");
        }
        String before = u.getRole() + (u.isActive() ? "" : " (khóa)");
        u.setFullName(in.fullName().trim());
        u.setPhone(in.phone() == null || in.phone().isBlank() ? null : in.phone().trim());
        u.setRole(in.role());
        u.setActive(in.active());
        if (in.newPassword() != null && !in.newPassword().isBlank()) u.setPasswordHash(encoder.encode(in.newPassword()));
        users.save(u);
        if (in.role() == Role.STAFF) ensureStaffProfile(u);
        audit.log(me, "USER_UPDATE", "USER", u.getId(), before + " -> " + u.getRole() + (u.isActive() ? "" : " (khóa)"));
        return row(u);
    }

    private void ensureStaffProfile(User u) {
        if (staffRepo.findByUserId(u.getId()).isPresent()) return;
        Staff s = new Staff();
        s.setUserId(u.getId());
        s.setFullName(u.getFullName());
        s.setPhone(u.getPhone());
        s.setEmail(u.getEmail());
        s.setActive(true);
        staffRepo.save(s);
    }

    // ---------- Cau hinh ----------

    public List<SettingsService.Setting> settings() {
        return settings.all();
    }

    @Transactional
    public List<SettingsService.Setting> updateSetting(String key, String value) {
        if (value == null || !value.trim().matches("\\d{1,5}")) throw ApiException.badRequest("INVALID_VALUE", "Giá trị phải là số nguyên không âm");
        int v = Integer.parseInt(value.trim());
        if ("deposit_percent".equals(key) && v > 100) throw ApiException.badRequest("INVALID_VALUE", "Tỷ lệ cọc tối đa 100%");
        if ("quote_valid_days".equals(key) && v < 1) throw ApiException.badRequest("INVALID_VALUE", "Hiệu lực báo giá tối thiểu 1 ngày");
        settings.update(key, String.valueOf(v));
        audit.log(current.id(), "SETTING_UPDATE", "SETTING", null, key + "=" + v);
        return settings.all();
    }

    // ---------- Lich su thao tac ----------

    public record AuditRow(Long id, String actorName, String actorEmail, String action, String entity, Long entityId, String detail,
                           LocalDateTime createdAt) {}

    @Transactional(readOnly = true)
    public PageResponse<AuditRow> audit(String q, int page, int size) {
        int sz = Math.min(Math.max(size, 1), 100);
        int pg = Math.max(page, 0);
        String like = q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase() + "%";
        String where = like == null ? "" : " WHERE LOWER(a.action) LIKE ? OR LOWER(a.detail) LIKE ? OR LOWER(u.email) LIKE ? ";
        Object[] wargs = like == null ? new Object[0] : new Object[]{like, like, like};
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id" + where, Long.class, wargs);
        Object[] args = new Object[wargs.length + 2];
        System.arraycopy(wargs, 0, args, 0, wargs.length);
        args[wargs.length] = sz;
        args[wargs.length + 1] = pg * sz;
        List<AuditRow> rows = jdbc.query("SELECT a.id, u.full_name, u.email, a.action, a.entity, a.entity_id, a.detail, a.created_at "
                + "FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id" + where + " ORDER BY a.id DESC LIMIT ? OFFSET ?",
                (rs, i) -> new AuditRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getObject(6) == null ? null : rs.getLong(6), rs.getString(7), rs.getTimestamp(8).toLocalDateTime()), args);
        long tot = total == null ? 0 : total;
        return new PageResponse<>(rows, pg, sz, tot, (int) Math.ceil(tot / (double) sz));
    }
}
