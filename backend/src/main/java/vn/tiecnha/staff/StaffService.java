package vn.tiecnha.staff;

import jakarta.validation.constraints.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.auth.AuthController;
import vn.tiecnha.auth.CurrentUser;
import vn.tiecnha.auth.Role;
import vn.tiecnha.auth.User;
import vn.tiecnha.auth.UserRepository;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;

/** Quan ly ho so nhan vien (ADMIN). Dieu phoi chi xem. Uu tien ngung hoat dong thay vi xoa. */
@Service
public class StaffService {
    private final StaffRepository staffRepo;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final CurrentUser current;
    private final AuditService audit;

    public StaffService(StaffRepository staffRepo, UserRepository users, PasswordEncoder encoder, CurrentUser current, AuditService audit) {
        this.staffRepo = staffRepo;
        this.users = users;
        this.encoder = encoder;
        this.current = current;
        this.audit = audit;
    }

    public record StaffDto(Long id, String fullName, String phone, String email, boolean active, String note, List<String> skills,
                           Long userId, String accountEmail, Boolean accountActive) {}

    public record StaffInput(@NotBlank(message = "Nhập họ tên") @Size(max = 120) String fullName,
                             @NotBlank(message = "Nhập số điện thoại")
                             @Pattern(regexp = AuthController.PHONE_REGEX, message = AuthController.PHONE_MSG) String phone,
                             @Email(message = "Email không hợp lệ") @Size(max = 160) String email,
                             boolean active,
                             @Size(max = 500) String note,
                             @NotEmpty(message = "Chọn ít nhất một kỹ năng") Set<Skill> skills,
                             /** Tao tai khoan dang nhap STAFF (tuy chon, chi khi tao moi / chua co tai khoan). */
                             boolean createAccount,
                             @Size(min = 8, max = 72, message = "Mật khẩu từ 8 ký tự") String password) {}

    @Transactional(readOnly = true)
    public List<StaffDto> list() {
        List<Staff> all = staffRepo.findAllByOrderByActiveDescFullNameAsc();
        Map<Long, User> accounts = users.findAllById(all.stream().map(Staff::getUserId).filter(Objects::nonNull).toList())
                .stream().collect(Collectors.toMap(User::getId, u -> u));
        return all.stream().map(s -> toDto(s, s.getUserId() == null ? null : accounts.get(s.getUserId()))).toList();
    }

    @Transactional
    public StaffDto create(StaffInput in) {
        Staff s = new Staff();
        apply(s, in);
        staffRepo.saveAndFlush(s);
        User u = in.createAccount() ? createAccount(s, in) : null;
        audit.log(current.id(), "STAFF_CREATE", "STAFF", s.getId(), s.getFullName());
        return toDto(s, u);
    }

    @Transactional
    public StaffDto update(Long id, StaffInput in) {
        Staff s = staffRepo.findById(id).orElseThrow(() -> ApiException.notFound("nhân viên"));
        apply(s, in);
        User u = s.getUserId() == null ? null : users.findById(s.getUserId()).orElse(null);
        if (u == null && in.createAccount()) u = createAccount(s, in);
        if (u != null) {
            u.setFullName(s.getFullName());
            u.setPhone(s.getPhone());
        }
        staffRepo.save(s);
        audit.log(current.id(), "STAFF_UPDATE", "STAFF", s.getId(), s.getFullName() + (s.isActive() ? "" : " (ngừng hoạt động)"));
        return toDto(s, u);
    }

    private void apply(Staff s, StaffInput in) {
        s.setFullName(in.fullName().trim());
        s.setPhone(in.phone().trim());
        s.setEmail(in.email() == null || in.email().isBlank() ? null : in.email().trim().toLowerCase());
        s.setActive(in.active());
        s.setNote(in.note() == null || in.note().isBlank() ? null : in.note().trim());
        s.getSkills().clear();
        s.getSkills().addAll(in.skills());
    }

    private User createAccount(Staff s, StaffInput in) {
        if (s.getEmail() == null) throw ApiException.badRequest("EMAIL_REQUIRED", "Cần email để tạo tài khoản đăng nhập");
        if (in.password() == null || in.password().length() < 8) throw ApiException.badRequest("PASSWORD_REQUIRED", "Mật khẩu từ 8 ký tự");
        if (users.existsByEmailIgnoreCase(s.getEmail())) throw ApiException.conflict("EMAIL_TAKEN", "Email đã được dùng cho tài khoản khác");
        User u = new User();
        u.setEmail(s.getEmail());
        u.setFullName(s.getFullName());
        u.setPhone(s.getPhone());
        u.setRole(Role.STAFF);
        u.setActive(true);
        u.setPasswordHash(encoder.encode(in.password()));
        users.saveAndFlush(u);
        s.setUserId(u.getId());
        staffRepo.save(s);
        return u;
    }

    private static StaffDto toDto(Staff s, User u) {
        return new StaffDto(s.getId(), s.getFullName(), s.getPhone(), s.getEmail(), s.isActive(), s.getNote(),
                s.getSkills().stream().map(Enum::name).sorted().toList(), s.getUserId(), u == null ? null : u.getEmail(),
                u == null ? null : u.isActive());
    }
}
