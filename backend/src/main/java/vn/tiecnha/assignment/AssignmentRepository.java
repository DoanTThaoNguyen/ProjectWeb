package vn.tiecnha.assignment;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    @EntityGraph(attributePaths = {"staff", "booking"})
    List<Assignment> findByBookingIdOrderByShiftStart(Long bookingId);

    @EntityGraph(attributePaths = {"staff", "booking", "booking.service"})
    java.util.Optional<Assignment> findWithAllById(Long id);

    /** Giao nhau khi startA < endB va startB < endA; bo qua phan cong da huy. */
    @EntityGraph(attributePaths = {"booking"})
    @Query("""
            select a from Assignment a
            where a.staff.id = :staffId and a.status <> vn.tiecnha.assignment.AssignmentTaskStatus.CANCELLED
              and a.shiftStart < :end and :start < a.shiftEnd
              and (:excludeId is null or a.id <> :excludeId)
            """)
    List<Assignment> findOverlaps(@Param("staffId") Long staffId, @Param("start") LocalDateTime start,
                                  @Param("end") LocalDateTime end, @Param("excludeId") Long excludeId);

    @EntityGraph(attributePaths = {"staff", "booking", "booking.service"})
    @Query("""
            select a from Assignment a
            where a.shiftStart < :to and a.shiftEnd > :from
              and (:staffId is null or a.staff.id = :staffId)
            order by a.shiftStart
            """)
    List<Assignment> findInRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to, @Param("staffId") Long staffId);

    @EntityGraph(attributePaths = {"staff"})
    @Query("""
            select a from Assignment a
            where a.status <> vn.tiecnha.assignment.AssignmentTaskStatus.CANCELLED
              and a.shiftStart < :to and a.shiftEnd > :from
            """)
    List<Assignment> findActiveInRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
