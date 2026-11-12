package vn.tiecnha.payment;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByBookingIdOrderByPaidAtAscIdAsc(Long bookingId);
    Optional<Payment> findByIdempotencyKey(String key);
}
