package vn.tiecnha.booking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import vn.tiecnha.auth.AuthController;
import vn.tiecnha.payment.PaymentSummary;
import vn.tiecnha.quote.QuoteDto;

public final class BookingDtos {
    private BookingDtos() {}

    public record AddonSelection(@NotNull Long addonId, @Min(value = 1, message = "Số lượng phải lớn hơn 0") int quantity) {}

    public record EstimateRequest(
            @NotNull(message = "Vui lòng chọn thực đơn") Long menuId,
            @NotNull(message = "Vui lòng nhập số khách") @Positive(message = "Số khách phải lớn hơn 0") Integer guestCount,
            @Positive(message = "Số bàn phải lớn hơn 0") Integer tableCount,
            List<@Valid AddonSelection> addons) {}

    public record CreateBookingRequest(
            @NotBlank(message = "Vui lòng nhập tên người liên hệ") @Size(max = 120) String contactName,
            @NotBlank(message = "Vui lòng nhập số điện thoại")
            @Pattern(regexp = AuthController.PHONE_REGEX, message = AuthController.PHONE_MSG) String contactPhone,
            @NotNull(message = "Vui lòng chọn loại tiệc") Long serviceId,
            @NotNull(message = "Vui lòng chọn thực đơn") Long menuId,
            @NotNull(message = "Vui lòng chọn giờ bắt đầu") LocalDateTime startTime,
            @NotNull(message = "Vui lòng chọn giờ kết thúc") LocalDateTime endTime,
            @NotBlank(message = "Vui lòng nhập địa chỉ tổ chức") @Size(max = 255) String address,
            @NotNull(message = "Vui lòng nhập số khách") @Positive(message = "Số khách phải lớn hơn 0") @Max(value = 2000) Integer guestCount,
            @Positive(message = "Số bàn phải lớn hơn 0") Integer tableCount,
            @PositiveOrZero(message = "Ngân sách không được âm") BigDecimal budget,
            List<@Valid AddonSelection> addons,
            @Size(max = 1000) String note) {}

    public record CancelRequest(@NotBlank(message = "Vui lòng nhập lý do hủy") @Size(max = 500) String reason) {}

    public record BookingSummaryDto(Long id, String code, String serviceName, String menuName, LocalDateTime startTime,
                                    LocalDateTime endTime, String address, int guestCount, Integer tableCount,
                                    BigDecimal estimatedTotal, BigDecimal quotedTotal, String status, String paymentStatus,
                                    String assignmentStatus, boolean cancelRequested, String contactName, String contactPhone,
                                    String customerEmail, LocalDateTime createdAt, String menuImage) {}

    public record AddonLine(Long addonId, String name, int quantity, BigDecimal unitPrice, String chargeType) {}

    public record HistoryDto(String fromStatus, String toStatus, String changedByName, String note, LocalDateTime createdAt) {}

    public record PaymentDto(Long id, String type, BigDecimal amount, String method, String referenceCode,
                             LocalDateTime paidAt, String recordedByName, String note) {}

    public record AssignmentLite(Long id, Long staffId, String staffName, String staffPhone, String taskRole, String task,
                                 LocalDateTime shiftStart, LocalDateTime shiftEnd, String status, String note) {}

    public record BookingDetailDto(BookingSummaryDto summary, Long customerId, String customerName, Long serviceId, Long menuId,
                                   String menuSlug, BigDecimal menuPriceSnapshot, String menuUnitSnapshot, BigDecimal budget,
                                   String note, List<AddonLine> addons, String cancelReason, LocalDateTime cancelledAt,
                                   List<HistoryDto> history, List<QuoteDto> quotes, Long acceptedQuoteId,
                                   List<PaymentDto> payments, PaymentSummary paymentSummary,
                                   List<AssignmentLite> assignments, List<String> allowedActions) {}
}
