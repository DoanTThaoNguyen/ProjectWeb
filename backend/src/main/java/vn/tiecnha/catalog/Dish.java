package vn.tiecnha.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "dishes")
@Getter
@Setter
public class Dish {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private DishCategory category;
    private String name;
    private String description;
    private String image;
    private boolean active = true;
}
