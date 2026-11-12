package vn.tiecnha.payment;

import java.math.BigDecimal;
import java.util.List;

/**
 * Tong hop tien cua mot don.
 * paid = coc + phan con lai da thu; refunded = tong hoan; netPaid = paid - refunded;
 * remaining = total - netPaid (chi khi da co bao gia duoc chap nhan).
 */
public record PaymentSummary(BigDecimal total, BigDecimal depositRequired, BigDecimal paid, BigDecimal refunded,
                             BigDecimal netPaid, BigDecimal remaining) {

    public static PaymentSummary of(BigDecimal total, BigDecimal depositRequired, List<Payment> payments) {
        BigDecimal paid = BigDecimal.ZERO;
        BigDecimal refunded = BigDecimal.ZERO;
        for (Payment p : payments) {
            if (p.getType() == Payment.Type.REFUND) refunded = refunded.add(p.getAmount());
            else paid = paid.add(p.getAmount());
        }
        BigDecimal net = paid.subtract(refunded);
        BigDecimal remaining = total == null ? null : total.subtract(net).max(BigDecimal.ZERO);
        return new PaymentSummary(total, depositRequired, paid, refunded, net, remaining);
    }
}
