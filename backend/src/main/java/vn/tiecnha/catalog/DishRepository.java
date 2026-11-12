package vn.tiecnha.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DishRepository extends JpaRepository<Dish, Long> {
    @EntityGraph(attributePaths = "category")
    List<Dish> findAllByOrderByCategory_SortOrderAscNameAsc();
}
