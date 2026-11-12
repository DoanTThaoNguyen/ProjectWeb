package vn.tiecnha.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Dich vu bo sung khach chon, co ban chup ten/gia tai thoi diem dat. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class BookingAddon {
    @Column(name = "addon_id")
    private Long addonId;
    private int quantity;
    @Column(name = "addon_name_snapshot")
    private String addonName;
    @Column(name = "unit_price_snapshot")
    private BigDecimal unitPrice;
    @Column(name = "charge_type_snapshot")
    private String chargeType;
}
