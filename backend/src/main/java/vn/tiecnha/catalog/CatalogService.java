package vn.tiecnha.catalog;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.catalog.CatalogDtos.*;
import vn.tiecnha.common.ApiException;

@Service
@Transactional(readOnly = true)
public class CatalogService {
    private final PartyServiceRepository services;
    private final MenuRepository menus;
    private final AddonRepository addons;

    public CatalogService(PartyServiceRepository services, MenuRepository menus, AddonRepository addons) {
        this.services = services;
        this.menus = menus;
        this.addons = addons;
    }

    public List<ServiceDto> activeServices() {
        List<Menu> all = menus.findByActiveTrueOrderByServiceSortOrderAscPriceAsc();
        return services.findByActiveTrueOrderBySortOrder().stream().map(s -> {
            List<Menu> ms = all.stream().filter(m -> m.getService().getId().equals(s.getId())).toList();
            BigDecimal from = ms.stream().map(Menu::pricePerGuest).min(Comparator.naturalOrder()).orElse(null);
            return new ServiceDto(s.getId(), s.getCode(), s.getName(), s.getTagline(), s.getDescription(), s.getImage(),
                    s.getMinGuests(), s.isActive(), ms.size(), from);
        }).toList();
    }

    /** Tim kiem + loc thuc don dang phuc vu. Khoang gia so sanh tren gia quy doi/khach. */
    public List<MenuSummaryDto> searchMenus(String q, String serviceCode, BigDecimal minPrice, BigDecimal maxPrice, String sort) {
        String nq = q == null || q.isBlank() ? null : fold(q);
        Comparator<MenuSummaryDto> cmp = switch (sort == null ? "" : sort) {
            case "price_desc" -> Comparator.comparing(MenuSummaryDto::pricePerGuest).reversed();
            case "price_asc" -> Comparator.comparing(MenuSummaryDto::pricePerGuest);
            default -> Comparator.comparing(MenuSummaryDto::featured).reversed().thenComparing(MenuSummaryDto::pricePerGuest);
        };
        return menus.findByActiveTrueOrderByServiceSortOrderAscPriceAsc().stream()
                .filter(m -> m.getService().isActive())
                .filter(m -> serviceCode == null || serviceCode.isBlank() || m.getService().getCode().equalsIgnoreCase(serviceCode))
                .filter(m -> nq == null || fold(m.getName() + " " + (m.getSummary() == null ? "" : m.getSummary())).contains(nq))
                .filter(m -> minPrice == null || m.pricePerGuest().compareTo(minPrice) >= 0)
                .filter(m -> maxPrice == null || m.pricePerGuest().compareTo(maxPrice) <= 0)
                .map(MenuSummaryDto::of)
                .sorted(cmp)
                .toList();
    }

    public MenuDetailDto menuDetail(String slug) {
        Menu m = menus.findBySlug(slug).orElseThrow(() -> ApiException.notFound("thực đơn"));
        return detail(m);
    }

    public static MenuDetailDto detail(Menu m) {
        Map<String, List<DishDto>> groups = new LinkedHashMap<>();
        m.getDishes().stream()
                .sorted(Comparator.comparingInt(d -> d.getCategory().getSortOrder()))
                .forEach(d -> groups.computeIfAbsent(d.getCategory().getName(), k -> new java.util.ArrayList<>()).add(DishDto.of(d)));
        List<DishGroupDto> g = groups.entrySet().stream().map(e -> new DishGroupDto(e.getKey(), e.getValue())).toList();
        return new MenuDetailDto(MenuSummaryDto.of(m), m.getDescription(), g, m.getDishes().stream().map(Dish::getId).toList());
    }

    public List<AddonDto> activeAddons() {
        return addons.findByActiveTrueOrderBySortOrder().stream().map(AddonDto::of).toList();
    }

    /** Bo dau tieng Viet de tim kiem khong dau. */
    static String fold(String s) {
        String n = Normalizer.normalize(s.toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.replace('đ', 'd');
    }
}
