package vn.tiecnha.quote;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Bao gia (moi lan sua sau khi gui = mot phien ban moi; ban da gui khong bi sua). */
@Entity
@Table(name = "quotes")
@Getter
@Setter
public class Quote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "booking_id")
    private Long bookingId;
    @Column(name = "version_no")
    private int versionNo;
    @Enumerated(EnumType.STRING)
    private QuoteStatus status;
    private BigDecimal subtotal;
    private BigDecimal total;
    @Column(name = "deposit_amount")
    private BigDecimal depositAmount;
    @Column(name = "valid_until")
    private LocalDate validUntil;
    private String notes;
    private String terms;
    @Column(name = "created_by")
    private Long createdBy;
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;
    @Column(name = "accepted_by")
    private Long acceptedBy;
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "quote", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder")
    private List<QuoteItem> items = new ArrayList<>();
}
