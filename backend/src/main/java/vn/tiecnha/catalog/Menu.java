package vn.tiecnha.catalog;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "menus")
@Getter
@Setter
public class Menu {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id")
    private PartyService service;
    private String name;
    private String slug;
    private String summary;
    private String description;
    private String image;
    private BigDecimal price;
    @Enumerated(EnumType.STRING)
    @Column(name = "price_unit")
    private PriceUnit priceUnit;
    @Column(name = "guests_per_table")
    private Integer guestsPerTable;
    @Column(name = "min_quantity")
    private int minQuantity = 1;
    private boolean featured;
    private boolean active = true;

    @ManyToMany
    @JoinTable(name = "menu_dishes", joinColumns = @JoinColumn(name = "menu_id"),
            inverseJoinColumns = @JoinColumn(name = "dish_id"))
    @OrderColumn(name = "sort_order")
    private List<Dish> dishes = new ArrayList<>();

    /** Gia quy doi tren moi khach, dung cho loc khoang gia. */
    public BigDecimal pricePerGuest() {
        if (priceUnit == PriceUnit.TABLE && guestsPerTable != null && guestsPerTable > 0) {
            return price.divide(BigDecimal.valueOf(guestsPerTable), 0, RoundingMode.HALF_UP);
        }
        return price;
    }
}
