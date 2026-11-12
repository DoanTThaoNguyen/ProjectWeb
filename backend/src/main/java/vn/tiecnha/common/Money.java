package vn.tiecnha.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;

/** Dinh dang VND cho thong bao: 8442000 -> "8.442.000đ". */
public final class Money {
    private Money() {}

    public static String vnd(BigDecimal v) {
        if (v == null) return "—";
        DecimalFormatSymbols sym = new DecimalFormatSymbols();
        sym.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", sym).format(v.setScale(0, RoundingMode.HALF_UP)) + "đ";
    }
}
