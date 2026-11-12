package vn.tiecnha.common;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Cau hinh tap trung (ten thuong hieu, JWT, CORS, seed). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String brandName,
        String jwtSecret,
        int jwtTtlHours,
        List<String> corsOrigins,
        boolean seedDemo) {
}
