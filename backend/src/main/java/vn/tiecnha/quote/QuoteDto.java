package vn.tiecnha.quote;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record QuoteDto(Long id, int versionNo, String status, BigDecimal subtotal, BigDecimal total, BigDecimal depositAmount,
                       LocalDate validUntil, boolean expired, String notes, String terms, LocalDateTime sentAt,
                       LocalDateTime acceptedAt, List<Item> items) {

    public record Item(Long id, String itemType, String description, BigDecimal quantity, String unit,
                       BigDecimal unitPrice, BigDecimal amount) {}

    public static QuoteDto of(Quote q, LocalDate today) {
        return new QuoteDto(q.getId(), q.getVersionNo(), q.getStatus().name(), q.getSubtotal(), q.getTotal(), q.getDepositAmount(),
                q.getValidUntil(), q.getValidUntil().isBefore(today), q.getNotes(), q.getTerms(), q.getSentAt(), q.getAcceptedAt(),
                q.getItems().stream().map(i -> new Item(i.getId(), i.getItemType().name(), i.getDescription(), i.getQuantity(),
                        i.getUnit(), i.getUnitPrice(), i.getAmount())).toList());
    }
}
