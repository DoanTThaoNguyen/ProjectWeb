package vn.tiecnha.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuRepository extends JpaRepository<Menu, Long> {
    @EntityGraph(attributePaths = "service")
    List<Menu> findByActiveTrueOrderByServiceSortOrderAscPriceAsc();

    @EntityGraph(attributePaths = "service")
    List<Menu> findAllByOrderByServiceSortOrderAscPriceAsc();

    @EntityGraph(attributePaths = {"service", "dishes", "dishes.category"})
    Optional<Menu> findBySlug(String slug);

    @EntityGraph(attributePaths = {"service", "dishes", "dishes.category"})
    Optional<Menu> findWithDishesById(Long id);

    boolean existsBySlug(String slug);
}
