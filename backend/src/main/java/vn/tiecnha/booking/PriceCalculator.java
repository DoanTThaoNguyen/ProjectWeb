package vn.tiecnha.booking;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import vn.tiecnha.catalog.Addon;
import vn.tiecnha.catalog.Menu;
import vn.tiecnha.catalog.PriceUnit;
import vn.tiecnha.common.ApiException;

/**
 * Tinh gia tam tinh o backend (frontend chi hien thi). Dung BigDecimal, lam tron toi dong.
 * - Thuc don theo ban: so ban x gia/ban; so ban toi thieu = ceil(so khach / khach tieu chuan moi ban).
 * - Thuc don theo khach: so khach x gia/khach.
 * - Dich vu bo sung: FIXED = so luong x don gia; PER_GUEST = so khach x don gia; PER_TABLE = so ban x don gia.
 */
public final class PriceCalculator {
    private PriceCalculator() {}

    public record Line(String type, Long refId, String description, BigDecimal quantity, String unit,
                       BigDecimal unitPrice, BigDecimal amount) {}

    public record Estimate(List<Line> lines, BigDecimal total, Integer tableCount, int minTables) {}

    public record AddonChoice(Addon addon, int quantity) {}

    public static int minTables(Menu menu, int guests) {
        if (menu.getPriceUnit() != PriceUnit.TABLE) return 0;
        int byGuests = (int) Math.ceil(guests / (double) menu.getGuestsPerTable());
        return Math.max(byGuests, menu.getMinQuantity());
    }

    public static Estimate estimate(Menu menu, int guests, Integer tableCount, List<AddonChoice> addons) {
        if (guests <= 0) throw ApiException.badRequest("INVALID_GUESTS", "Số khách phải lớn hơn 0");
        List<Line> lines = new ArrayList<>();
        Integer tables = null;
        int minTables = minTables(menu, guests);
        if (menu.getPriceUnit() == PriceUnit.TABLE) {
            tables = tableCount == null ? minTables : tableCount;
            if (tables <= 0) throw ApiException.badRequest("INVALID_TABLES", "Số bàn phải lớn hơn 0");
            if (tables < minTables) {
                throw ApiException.badRequest("NOT_ENOUGH_TABLES", "Cần tối thiểu " + minTables + " bàn cho " + guests
                        + " khách (" + menu.getGuestsPerTable() + " khách/bàn, tối thiểu " + menu.getMinQuantity() + " bàn)");
            }
            lines.add(new Line("MENU", menu.getId(), "Thực đơn " + menu.getName(), BigDecimal.valueOf(tables), "bàn",
                    menu.getPrice(), menu.getPrice().multiply(BigDecimal.valueOf(tables))));
        } else {
            if (guests < menu.getMinQuantity()) {
                throw ApiException.badRequest("NOT_ENOUGH_GUESTS", "Thực đơn này áp dụng từ " + menu.getMinQuantity() + " khách");
            }
            lines.add(new Line("MENU", menu.getId(), "Thực đơn " + menu.getName(), BigDecimal.valueOf(guests), "khách",
                    menu.getPrice(), menu.getPrice().multiply(BigDecimal.valueOf(guests))));
        }
        for (AddonChoice c : addons) {
            Addon a = c.addon();
            int qty = switch (a.getChargeType()) {
                case FIXED -> c.quantity();
                case PER_GUEST -> guests;
                case PER_TABLE -> tables != null ? tables : (int) Math.ceil(guests / 10.0);
            };
            if (qty <= 0) throw ApiException.badRequest("INVALID_QTY", "Số lượng dịch vụ bổ sung phải lớn hơn 0");
            lines.add(new Line("ADDON", a.getId(), a.getName(), BigDecimal.valueOf(qty), a.getUnitLabel(), a.getPrice(),
                    a.getPrice().multiply(BigDecimal.valueOf(qty))));
        }
        BigDecimal total = lines.stream().map(Line::amount).reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(0, RoundingMode.HALF_UP);
        return new Estimate(lines, total, tables, minTables);
    }
}
