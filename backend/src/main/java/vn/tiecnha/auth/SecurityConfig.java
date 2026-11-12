package vn.tiecnha.auth;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import vn.tiecnha.common.AppProperties;

/**
 * API stateless voi JWT Bearer -> khong dung cookie phien nen tat CSRF.
 * Quyen theo vai tro duoc lay tu DB moi request (khoa tai khoan co hieu luc ngay).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtEncoder jwtEncoder(AppProperties props) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(JwtService.key(props.jwtSecret())));
    }

    @Bean
    public JwtDecoder jwtDecoder(AppProperties props) {
        return NimbusJwtDecoder.withSecretKey(JwtService.key(props.jwtSecret())).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, UserRepository users) throws Exception {
        http
                .csrf(c -> c.disable())
                .cors(c -> {})
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/actuator/health/**", "/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/public/estimate").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/coord/**").hasAnyRole("COORDINATOR", "ADMIN")
                        .requestMatchers("/api/staff/**").hasRole("STAFF")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwt -> toAuth(jwt, users))));
        return http.build();
    }

    private AbstractAuthenticationToken toAuth(Jwt jwt, UserRepository users) {
        User u = users.findById(Long.valueOf(jwt.getSubject()))
                .orElseThrow(() -> new DisabledException("Tài khoản không tồn tại"));
        if (!u.isActive()) {
            throw new DisabledException("Tài khoản đã bị khóa");
        }
        return new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name())),
                String.valueOf(u.getId()));
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(props.corsOrigins());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }
}
