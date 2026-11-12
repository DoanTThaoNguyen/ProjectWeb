package vn.tiecnha.admin;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.auth.CurrentUser;
import vn.tiecnha.catalog.*;
import vn.tiecnha.catalog.CatalogDtos.*;
import vn.tiecnha.common.ApiException;
import vn.tiecnha.common.AuditService;

/**
 * Quan tri danh muc mon, mon, thuc don, dich vu bo sung, hinh thuc tiec.
 * Khong xoa du lieu da dung: chi bat/tat "active". Doi gia thuc don khong anh huong don/bao gia cu (da chup gia).
 */
@Service
public class CatalogAdminService {
    private final MenuRepository menus;
    private final DishRepository dishes;
    private final DishCategoryRepository categories;
    private final AddonRepository addons;
    private final PartyServiceRepository services;
    private final CurrentUser current;
    private final AuditService audit;

    public CatalogAdminService(MenuRepository menus, DishRepository dishes, DishCategoryRepository categories, AddonRepository addons,
                               PartyServiceRepository services, CurrentUser current, AuditService audit) {
        this.menus = menus;
        this.dishes = dishes;
        this.categories = categories;
        this.addons = addons;
        this.services = services;
        this.current = current;
        this.audit = audit;
    }

    // ---------- Thuc don ----------

    public record MenuInput(@NotNull(message = "Chọn hình thức tiệc") Long serviceId,
                            @NotBlank(message = "Nhập tên thực đơn") @Size(max = 150) String name,
                            @Size(max = 160) @Pattern(regexp = "^[a-z0-9-]*$", message = "Slug chỉ gồm chữ thường không dấu, số, gạch ngang") String slug,
                            @Size(max = 255) String summary,
                            @Size(max = 5000) String description,
                            @Size(max = 255) String image,
                            @NotNull(message = "Nhập giá") @PositiveOrZero(message = "Giá không được âm") BigDecimal price,
                            @NotNull(message = "Chọn đơn vị tính") PriceUnit priceUnit,
                            @Positive(message = "Số khách/bàn phải lớn hơn 0") Integer guestsPerTable,
                            @Min(value = 1, message = "Tối thiểu 1") int minQuantity,
                            boolean featured, boolean active,
                            List<Long> dishIds) {}

    @Transactional(readOnly = true)
    public List<MenuSummaryDto> allMenus() {
        return menus.findAllByOrderByServiceSortOrderAscPriceAsc().stream().map(MenuSummaryDto::of).toList();
    }

    @Transactional(readOnly = true)
    public MenuDetailDto menu(Long id) {
        return CatalogService.detail(menus.findWithDishesById(id).orElseThrow(() -> ApiException.notFound("thực đơn")));
    }

    @Transactional
    public MenuDetailDto saveMenu(Long id, MenuInput in) {
        Menu m = id == null ? new Menu() : menus.findWithDishesById(id).orElseThrow(() -> ApiException.notFound("thực đơn"));
        PartyService svc = services.findById(in.serviceId()).orElseThrow(() -> ApiException.notFound("hình thức tiệc"));
        if (in.priceUnit() == PriceUnit.TABLE && (in.guestsPerTable() == null || in.guestsPerTable() < 1)) {
            throw ApiException.badRequest("GUESTS_PER_TABLE_REQUIRED", "Thực đơn tính theo bàn cần số khách tiêu chuẩn/bàn");
        }
        String slug = in.slug() == null || in.slug().isBlank() ? slugify(in.name()) : in.slug().trim();
        if (!slug.equals(m.getSlug()) && menus.existsBySlug(slug)) throw ApiException.conflict("SLUG_TAKEN", "Đường dẫn (slug) đã tồn tại");
        m.setService(svc);
        m.setName(in.name().trim());
        m.setSlug(slug);
        m.setSummary(blank(in.summary()));
        m.setDescription(blank(in.description()));
        m.setImage(blank(in.image()));
        m.setPrice(in.price());
        m.setPriceUnit(in.priceUnit());
        m.setGuestsPerTable(in.priceUnit() == PriceUnit.TABLE ? in.guestsPerTable() : null);
        m.setMinQuantity(in.minQuantity());
        m.setFeatured(in.featured());
        m.setActive(in.active());
        List<Long> ids = in.dishIds() == null ? List.of() : in.dishIds().stream().distinct().toList();
        Map<Long, Dish> found = dishes.findAllById(ids).stream().collect(Collectors.toMap(Dish::getId, Function.identity()));
        if (found.size() != ids.size()) throw ApiException.badRequest("DISH_NOT_FOUND", "Có món không tồn tại");
        m.getDishes().clear();
        ids.forEach(d -> m.getDishes().add(found.get(d)));
        menus.saveAndFlush(m);
        audit.log(current.id(), id == null ? "MENU_CREATE" : "MENU_UPDATE", "MENU", m.getId(),
                m.getName() + " " + m.getPrice().toPlainString() + "/" + m.getPriceUnit() + (m.isActive() ? "" : " (ngừng)"));
        return CatalogService.detail(menus.findWithDishesById(m.getId()).orElseThrow());
    }

    // ---------- Mon an & danh muc ----------

    public record DishInput(@NotNull(message = "Chọn danh mục") Long categoryId,
                            @NotBlank(message = "Nhập tên món") @Size(max = 150) String name,
                            @Size(max = 500) String description, @Size(max = 255) String image, boolean active) {}

    public record CategoryInput(@NotBlank(message = "Nhập tên danh mục") @Size(max = 100) String name, int sortOrder, boolean active) {}

    public record CategoryDto(Long id, String name, int sortOrder, boolean active, long dishCount) {}

    @Transactional(readOnly = true)
    public List<DishDto> allDishes() {
        return dishes.findAllByOrderByCategory_SortOrderAscNameAsc().stream().map(DishDto::of).toList();
    }

    @Transactional
    public DishDto saveDish(Long id, DishInput in) {
        Dish d = id == null ? new Dish() : dishes.findById(id).orElseThrow(() -> ApiException.notFound("món"));
        d.setCategory(categories.findById(in.categoryId()).orElseThrow(() -> ApiException.notFound("danh mục")));
        d.setName(in.name().trim());
        d.setDescription(blank(in.description()));
        d.setImage(blank(in.image()));
        d.setActive(in.active());
        dishes.saveAndFlush(d);
        audit.log(current.id(), id == null ? "DISH_CREATE" : "DISH_UPDATE", "DISH", d.getId(), d.getName());
        return DishDto.of(d);
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> allCategories() {
        Map<Long, Long> counts = dishes.findAll().stream().collect(Collectors.groupingBy(d -> d.getCategory().getId(), Collectors.counting()));
        return categories.findAllByOrderBySortOrder().stream()
                .map(c -> new CategoryDto(c.getId(), c.getName(), c.getSortOrder(), c.isActive(), counts.getOrDefault(c.getId(), 0L))).toList();
    }

    @Transactional
    public CategoryDto saveCategory(Long id, CategoryInput in) {
        DishCategory c = id == null ? new DishCategory() : categories.findById(id).orElseThrow(() -> ApiException.notFound("danh mục"));
        c.setName(in.name().trim());
        c.setSortOrder(in.sortOrder());
        c.setActive(in.active());
        categories.saveAndFlush(c);
        audit.log(current.id(), id == null ? "CATEGORY_CREATE" : "CATEGORY_UPDATE", "DISH_CATEGORY", c.getId(), c.getName());
        return new CategoryDto(c.getId(), c.getName(), c.getSortOrder(), c.isActive(), 0);
    }

    // ---------- Dich vu bo sung ----------

    public record AddonInput(@NotBlank(message = "Nhập tên dịch vụ") @Size(max = 150) String name,
                             @Size(max = 500) String description,
                             @NotNull(message = "Nhập giá") @PositiveOrZero(message = "Giá không được âm") BigDecimal price,
                             @NotNull(message = "Chọn cách tính") Addon.ChargeType chargeType,
                             @NotBlank(message = "Nhập đơn vị") @Size(max = 30) String unitLabel,
                             int sortOrder, boolean active) {}

    @Transactional(readOnly = true)
    public List<AddonDto> allAddons() {
        return addons.findAllByOrderBySortOrder().stream().map(AddonDto::of).toList();
    }

    @Transactional
    public AddonDto saveAddon(Long id, AddonInput in) {
        Addon a = id == null ? new Addon() : addons.findById(id).orElseThrow(() -> ApiException.notFound("dịch vụ bổ sung"));
        a.setName(in.name().trim());
        a.setDescription(blank(in.description()));
        a.setPrice(in.price());
        a.setChargeType(in.chargeType());
        a.setUnitLabel(in.unitLabel().trim());
        a.setSortOrder(in.sortOrder());
        a.setActive(in.active());
        addons.saveAndFlush(a);
        audit.log(current.id(), id == null ? "ADDON_CREATE" : "ADDON_UPDATE", "ADDON", a.getId(), a.getName() + " " + a.getPrice().toPlainString());
        return AddonDto.of(a);
    }

    // ---------- Hinh thuc tiec ----------

    public record ServiceInput(@NotBlank(message = "Nhập tên") @Size(max = 120) String name, @Size(max = 255) String tagline,
                               @Size(max = 5000) String description, @Size(max = 255) String image,
                               @Min(value = 1, message = "Tối thiểu 1 khách") int minGuests, Integer sortOrder, boolean active) {}

    @Transactional(readOnly = true)
    public List<ServiceDto> allServices() {
        List<Menu> all = menus.findAllByOrderByServiceSortOrderAscPriceAsc();
        return services.findAllByOrderBySortOrder().stream().map(s -> {
            List<Menu> ms = all.stream().filter(m -> m.getService().getId().equals(s.getId()) && m.isActive()).toList();
            BigDecimal from = ms.stream().map(Menu::pricePerGuest).min(Comparator.naturalOrder()).orElse(null);
            return new ServiceDto(s.getId(), s.getCode(), s.getName(), s.getTagline(), s.getDescription(), s.getImage(), s.getMinGuests(),
                    s.isActive(), ms.size(), from);
        }).toList();
    }

    @Transactional
    public ServiceDto saveService(Long id, ServiceInput in) {
        PartyService s = services.findById(id).orElseThrow(() -> ApiException.notFound("hình thức tiệc"));
        s.setName(in.name().trim());
        s.setTagline(blank(in.tagline()));
        s.setDescription(blank(in.description()));
        s.setImage(blank(in.image()));
        s.setMinGuests(in.minGuests());
        if (in.sortOrder() != null) s.setSortOrder(in.sortOrder());
        s.setActive(in.active());
        services.saveAndFlush(s);
        audit.log(current.id(), "SERVICE_UPDATE", "SERVICE", s.getId(), s.getName() + (s.isActive() ? "" : " (ngừng)"));
        return allServices().stream().filter(x -> x.id().equals(id)).findFirst().orElseThrow();
    }

    static String slugify(String s) {
        String n = Normalizer.normalize(s.toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}", "").replace('đ', 'd');
        n = n.replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return n.isEmpty() ? "thuc-don" : n.substring(0, Math.min(n.length(), 150));
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
