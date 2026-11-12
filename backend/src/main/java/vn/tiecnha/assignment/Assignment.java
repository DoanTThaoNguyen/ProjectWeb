package vn.tiecnha.assignment;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import vn.tiecnha.booking.Booking;
import vn.tiecnha.staff.Skill;
import vn.tiecnha.staff.Staff;

@Entity
@Table(name = "assignments")
@Getter
@Setter
public class Assignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id")
    private Booking booking;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_id")
    private Staff staff;
    @Enumerated(EnumType.STRING)
    @Column(name = "task_role")
    private Skill taskRole;
    private String task;
    @Column(name = "shift_start")
    private LocalDateTime shiftStart;
    @Column(name = "shift_end")
    private LocalDateTime shiftEnd;
    private String note;
    @Enumerated(EnumType.STRING)
    private AssignmentTaskStatus status = AssignmentTaskStatus.ASSIGNED;
    @Column(name = "created_by")
    private Long createdBy;
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
