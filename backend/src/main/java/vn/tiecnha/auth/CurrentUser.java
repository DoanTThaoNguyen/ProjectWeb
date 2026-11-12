package vn.tiecnha.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import vn.tiecnha.common.ApiException;

/** Truy cap nguoi dung dang dang nhap (theo JWT). */
@Component
public class CurrentUser {
    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public Long id() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !a.isAuthenticated() || "anonymousUser".equals(a.getName())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập");
        }
        return Long.valueOf(a.getName());
    }

    public User get() {
        return users.findById(id()).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập"));
    }

    public boolean hasRole(Role... roles) {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null) return false;
        for (Role r : roles) {
            if (a.getAuthorities().stream().anyMatch(g -> g.getAuthority().equals("ROLE_" + r.name()))) return true;
        }
        return false;
    }

    public boolean isBackOffice() {
        return hasRole(Role.COORDINATOR, Role.ADMIN);
    }
}
