package vn.tiecnha.booking;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    @EntityGraph(attributePaths = {"service", "menu"})
    List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    @EntityGraph(attributePaths = {"service", "menu", "customer"})
    Optional<Booking> findWithAllById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> lockById(@Param("id") Long id);

    boolean existsByCode(String code);

    @EntityGraph(attributePaths = {"service", "customer"})
    @Query("""
            select b from Booking b
            where (:status is null or b.status = :status)
              and (:from is null or b.startTime >= :from)
              and (:to is null or b.startTime < :to)
              and (:q is null or lower(b.code) like lower(concat('%', :q, '%'))
                   or lower(b.contactName) like lower(concat('%', :q, '%'))
                   or b.contactPhone like concat('%', :q, '%')
                   or lower(b.customer.email) like lower(concat('%', :q, '%')))
            """)
    Page<Booking> search(@Param("q") String q, @Param("status") BookingStatus status,
                         @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

    @EntityGraph(attributePaths = {"service"})
    List<Booking> findByStartTimeBetweenAndStatusInOrderByStartTime(LocalDateTime from, LocalDateTime to, Collection<BookingStatus> statuses);
}
