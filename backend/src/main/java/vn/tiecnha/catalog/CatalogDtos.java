package vn.tiecnha.catalog;

import java.math.BigDecimal;
import java.util.List;

/** DTO tra ve cho client (khong lo entity). */
public final class CatalogDtos {
    private CatalogDtos() {}

    public record ServiceDto(Long id, String code, String name, String tagline, String description, String image,
                             int minGuests, boolean active, long menuCount, BigDecimal fromPricePerGuest) {}

    public record DishDto(Long id, String name, String description, String image, Long categoryId, String categoryName, boolean active) {
        public static DishDto of(Dish d) {
            return new DishDto(d.getId(), d.getName(), d.getDescription(), d.getImage(),
                    d.getCategory().getId(), d.getCategory().getName(), d.isActive());
        }
    }

    public record MenuSummaryDto(Long id, String slug, String name, String summary, String image,
                                 Long serviceId, String serviceCode, String serviceName,
                                 BigDecimal price, String priceUnit, Integer guestsPerTable, int minQuantity,
                                 BigDecimal pricePerGuest, boolean featured, boolean active) {
        public static MenuSummaryDto of(Menu m) {
            return new MenuSummaryDto(m.getId(), m.getSlug(), m.getName(), m.getSummary(), m.getImage(),
                    m.getService().getId(), m.getService().getCode(), m.getService().getName(),
                    m.getPrice(), m.getPriceUnit().name(), m.getGuestsPerTable(), m.getMinQuantity(),
                    m.pricePerGuest(), m.isFeatured(), m.isActive());
        }
    }

    public record DishGroupDto(String category, List<DishDto> dishes) {}

    public record MenuDetailDto(MenuSummaryDto menu, String description, List<DishGroupDto> dishGroups, List<Long> dishIds) {}

    public record AddonDto(Long id, String name, String description, BigDecimal price, String chargeType, String unitLabel,
                           int sortOrder, boolean active) {
        public static AddonDto of(Addon a) {
            return new AddonDto(a.getId(), a.getName(), a.getDescription(), a.getPrice(), a.getChargeType().name(),
                    a.getUnitLabel(), a.getSortOrder(), a.isActive());
        }
    }
}
