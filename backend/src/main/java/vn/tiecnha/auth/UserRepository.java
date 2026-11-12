package vn.tiecnha.auth;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
            select u from User u
            where (:role is null or u.role = :role)
              and (:q is null or lower(u.fullName) like lower(concat('%', :q, '%'))
                   or lower(u.email) like lower(concat('%', :q, '%')) or u.phone like concat('%', :q, '%'))
            """)
    Page<User> search(@Param("q") String q, @Param("role") Role role, Pageable pageable);
}
