package vn.tiecnha.quote;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuoteRepository extends JpaRepository<Quote, Long> {
    @EntityGraph(attributePaths = "items")
    List<Quote> findByBookingIdOrderByVersionNoDesc(Long bookingId);

    @EntityGraph(attributePaths = "items")
    Optional<Quote> findWithItemsById(Long id);

    @Query("select coalesce(max(q.versionNo), 0) from Quote q where q.bookingId = :bookingId")
    int maxVersion(@Param("bookingId") Long bookingId);
}
