package vn.tiecnha.booking;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StatusHistoryRepository extends JpaRepository<StatusHistory, Long> {
    List<StatusHistory> findByBookingIdOrderByCreatedAtAscIdAsc(Long bookingId);
}
