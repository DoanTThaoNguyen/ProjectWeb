package vn.tiecnha.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;

@RestController
@RequestMapping("/api")
public class AuthController {
    public static final String PHONE_REGEX = "^(0|\\+84)(3|5|7|8|9)\\d{8}$";
    public static final String PHONE_MSG = "Số điện thoại không hợp lệ (VD: 0912345678)";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final CurrentUser current;
    private final AuditService audit;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, CurrentUser current, AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.current = current;
        this.audit = audit;
    }

    public record RegisterRequest(
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120) String fullName,
            @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 160) String email,
            @NotBlank(message = "Vui lòng nhập số điện thoại") @Pattern(regexp = PHONE_REGEX, message = PHONE_MSG) String phone,
            @NotBlank @Size(min = 6, max = 72, message = "Mật khẩu từ 6 đến 72 ký tự") String password) {}

    public record LoginRequest(@NotBlank(message = "Vui lòng nhập email") String email,
                               @NotBlank(message = "Vui lòng nhập mật khẩu") String password) {}

    public record UserDto(Long id, String email, String phone, String fullName, String role, boolean active, String address) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getPhone(), u.getFullName(), u.getRole().name(), u.isActive(), u.getAddress());
        }
    }

    public record AuthResponse(String token, UserDto user) {}

    public record ProfileRequest(
            @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120) String fullName,
            @NotBlank(message = "Vui lòng nhập số điện thoại") @Pattern(regexp = PHONE_REGEX, message = PHONE_MSG) String phone,
            @Size(max = 255) String address) {}

    public record PasswordRequest(@NotBlank String currentPassword,
                                  @NotBlank @Size(min = 6, max = 72, message = "Mật khẩu từ 6 đến 72 ký tự") String newPassword) {}

    /** Dang ky cong khai: luon tao CUSTOMER, bo qua moi truong role tu client. */
    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AuthResponse register(@Valid @RequestBody RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("EMAIL_TAKEN", "Email đã được sử dụng");
        }
        User u = new User();
        u.setEmail(email);
        u.setPhone(r.phone().trim());
        u.setFullName(r.fullName().trim());
        u.setPasswordHash(encoder.encode(r.password()));
        u.setRole(Role.CUSTOMER);
        users.save(u);
        audit.log(u.getId(), "REGISTER", "USER", u.getId(), null);
        return new AuthResponse(jwt.issue(u), UserDto.of(u));
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r) {
        User u = users.findByEmailIgnoreCase(r.email().trim())
                .filter(x -> encoder.matches(r.password(), x.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Email hoặc mật khẩu không đúng"));
        if (!u.isActive()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa, vui lòng liên hệ quản trị");
        }
        return new AuthResponse(jwt.issue(u), UserDto.of(u));
    }

    @GetMapping("/auth/me")
    public UserDto me() {
        return UserDto.of(current.get());
    }

    @PutMapping("/me")
    @Transactional
    public UserDto updateProfile(@Valid @RequestBody ProfileRequest r) {
        User u = current.get();
        u.setFullName(r.fullName().trim());
        u.setPhone(r.phone().trim());
        u.setAddress(r.address() == null ? null : r.address().trim());
        return UserDto.of(users.save(u));
    }

    @PutMapping("/me/password")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody PasswordRequest r) {
        User u = current.get();
        if (!encoder.matches(r.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("WRONG_PASSWORD", "Mật khẩu hiện tại không đúng");
        }
        u.setPasswordHash(encoder.encode(r.newPassword()));
        users.save(u);
    }
}
