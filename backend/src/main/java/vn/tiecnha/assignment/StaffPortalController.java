package vn.tiecnha.assignment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import vn.tiecnha.assignment.AssignmentService.AssignmentDto;

/** API cho nhan vien (STAFF): chi xem va cap nhat cong viec cua chinh minh. */
@RestController
@RequestMapping("/api/staff")
public class StaffPortalController {
    private final AssignmentService assignments;

    public StaffPortalController(AssignmentService assignments) {
        this.assignments = assignments;
    }

    @GetMapping("/assignments")
    public List<AssignmentDto> mine(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return assignments.mine(from, to);
    }

    @GetMapping("/assignments/{id}")
    public AssignmentDto one(@PathVariable Long id) {
        return assignments.myOne(id);
    }

    public record StatusInput(@NotNull(message = "Chọn trạng thái") AssignmentTaskStatus status) {}

    @PostMapping("/assignments/{id}/status")
    public AssignmentDto status(@PathVariable Long id, @Valid @RequestBody StatusInput in) {
        return assignments.updateMyStatus(id, in.status());
    }
}
