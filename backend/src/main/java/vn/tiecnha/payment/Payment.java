package vn.tiecnha.payment;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/** Giao dich ghi nhan thu cong. amount luon duong; REFUND la tien tra lai khach. */
@Entity
@Table(name = "payments")
@Getter
@Setter
public class Payment {
    public enum Type { DEPOSIT, BALANCE, REFUND }
    public enum Method { CASH, BANK_TRANSFER, CARD, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "booking_id")
    private Long bookingId;
    @Enumerated(EnumType.STRING)
    private Type type;
    private BigDecimal amount;
    @Enumerated(EnumType.STRING)
    private Method method;
    @Column(name = "reference_code")
    private String referenceCode;
    @Column(name = "paid_at")
    private LocalDateTime paidAt;
    @Column(name = "recorded_by")
    private Long recordedBy;
    private String note;
    @Column(name = "idempotency_key")
    private String idempotencyKey;
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
