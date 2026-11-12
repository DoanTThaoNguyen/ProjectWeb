package vn.tiecnha.booking;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import vn.tiecnha.auth.User;
import vn.tiecnha.catalog.Menu;
import vn.tiecnha.catalog.PartyService;

@Entity
@Table(name = "bookings")
@Getter
@Setter
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @Column(name = "contact_name")
    private String contactName;
    @Column(name = "contact_phone")
    private String contactPhone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id")
    private PartyService service;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_id")
    private Menu menu;

    @Column(name = "start_time")
    private LocalDateTime startTime;
    @Column(name = "end_time")
    private LocalDateTime endTime;
    private String address;
    @Column(name = "guest_count")
    private int guestCount;
    @Column(name = "table_count")
    private Integer tableCount;
    private BigDecimal budget;
    private String note;

    @Column(name = "menu_name_snapshot")
    private String menuNameSnapshot;
    @Column(name = "menu_price_snapshot")
    private BigDecimal menuPriceSnapshot;
    @Column(name = "menu_unit_snapshot")
    private String menuUnitSnapshot;
    @Column(name = "estimated_total")
    private BigDecimal estimatedTotal;

    @Enumerated(EnumType.STRING)
    private BookingStatus status = BookingStatus.NEW;
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;
    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status")
    private AssignmentStatus assignmentStatus = AssignmentStatus.UNASSIGNED;

    @Column(name = "accepted_quote_id")
    private Long acceptedQuoteId;

    @Column(name = "cancel_requested")
    private boolean cancelRequested;
    @Column(name = "cancel_reason")
    private String cancelReason;
    @Column(name = "cancelled_by")
    private Long cancelledBy;
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    @Version
    private long version;

    @ElementCollection
    @CollectionTable(name = "booking_addons", joinColumns = @JoinColumn(name = "booking_id"))
    private List<BookingAddon> addons = new ArrayList<>();
}
