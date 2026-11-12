package vn.tiecnha.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AddonRepository extends JpaRepository<Addon, Long> {
    List<Addon> findByActiveTrueOrderBySortOrder();
    List<Addon> findAllByOrderBySortOrder();
}
