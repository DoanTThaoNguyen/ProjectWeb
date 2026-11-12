package vn.tiecnha.staff;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "staff")
@Getter
@Setter
public class Staff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id")
    private Long userId;
    @Column(name = "full_name")
    private String fullName;
    private String phone;
    private String email;
    private boolean active = true;
    private String note;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "staff_skills", joinColumns = @JoinColumn(name = "staff_id"))
    @Column(name = "skill")
    @Enumerated(EnumType.STRING)
    private Set<Skill> skills = new HashSet<>();
}
