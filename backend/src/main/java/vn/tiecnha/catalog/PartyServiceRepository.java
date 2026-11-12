package vn.tiecnha.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartyServiceRepository extends JpaRepository<PartyService, Long> {
    List<PartyService> findByActiveTrueOrderBySortOrder();
    List<PartyService> findAllByOrderBySortOrder();
    Optional<PartyService> findByCode(String code);
}
