package vn.tiecnha.staff;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StaffRepository extends JpaRepository<Staff, Long> {
    List<Staff> findAllByOrderByActiveDescFullNameAsc();
    List<Staff> findByActiveTrueOrderByFullName();
    Optional<Staff> findByUserId(Long userId);

    /** Khoa dong nhan vien de 2 yeu cau phan cong dong thoi phai xep hang. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Staff s where s.id = :id")
    Optional<Staff> lockById(@Param("id") Long id);
}
