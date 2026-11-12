package vn.tiecnha.booking;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "booking_status_history")
@Getter
@Setter
public class StatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "booking_id")
    private Long bookingId;
    @Enumerated(EnumType.STRING)
    @Column(name = "from_status")
    private BookingStatus fromStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "to_status")
    private BookingStatus toStatus;
    @Column(name = "changed_by")
    private Long changedBy;
    private String note;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
