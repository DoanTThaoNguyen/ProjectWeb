package vn.tiecnha.catalog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Hinh thuc tiec: tiec ban, buffet, BBQ, teabreak. */
@Entity
@Table(name = "party_services")
@Getter
@Setter
public class PartyService {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String code;
    private String name;
    private String tagline;
    private String description;
    private String image;
    @Column(name = "min_guests")
    private int minGuests = 1;
    @Column(name = "sort_order")
    private int sortOrder;
    private boolean active = true;
}
