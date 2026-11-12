package vn.tiecnha.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "dish_categories")
@Getter
@Setter
public class DishCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(name = "sort_order")
    private int sortOrder;
    private boolean active = true;
}
