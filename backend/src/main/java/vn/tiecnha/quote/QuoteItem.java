package vn.tiecnha.quote;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "quote_items")
@Getter
@Setter
public class QuoteItem {
    public enum ItemType { MENU, ADDON, FEE, DISCOUNT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quote_id")
    private Quote quote;
    @Enumerated(EnumType.STRING)
    @Column(name = "item_type")
    private ItemType itemType;
    private String description;
    private BigDecimal quantity;
    private String unit;
    @Column(name = "unit_price")
    private BigDecimal unitPrice;
    private BigDecimal amount;
    @Column(name = "sort_order")
    private int sortOrder;
}
