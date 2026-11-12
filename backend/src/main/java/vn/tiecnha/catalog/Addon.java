package vn.tiecnha.catalog;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/** Dich vu bo sung (trang tri, ban ghe, MC...). */
@Entity
@Table(name = "addons")
@Getter
@Setter
public class Addon {
    public enum ChargeType { FIXED, PER_GUEST, PER_TABLE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    @Enumerated(EnumType.STRING)
    @Column(name = "charge_type")
    private ChargeType chargeType;
    @Column(name = "unit_label")
    private String unitLabel;
    @Column(name = "sort_order")
    private int sortOrder;
    private boolean active = true;
}
