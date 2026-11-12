package vn.tiecnha.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DishCategoryRepository extends JpaRepository<DishCategory, Long> {
    List<DishCategory> findAllByOrderBySortOrder();
}
