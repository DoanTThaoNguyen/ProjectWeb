package vn.tiecnha.catalog;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import vn.tiecnha.catalog.CatalogDtos.*;
import vn.tiecnha.common.AppProperties;
import vn.tiecnha.common.SettingsService;

/** API cong khai: khach chua dang nhap van xem duoc. */
@RestController
@RequestMapping("/api/public")
public class PublicCatalogController {
    private final CatalogService catalog;
    private final SettingsService settings;
    private final AppProperties props;

    public PublicCatalogController(CatalogService catalog, SettingsService settings, AppProperties props) {
        this.catalog = catalog;
        this.settings = settings;
        this.props = props;
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("brandName", props.brandName());
        m.putAll(settings.publicConfig());
        return m;
    }

    @GetMapping("/services")
    public List<ServiceDto> services() {
        return catalog.activeServices();
    }

    @GetMapping("/menus")
    public List<MenuSummaryDto> menus(@RequestParam(required = false) String q,
                                      @RequestParam(required = false) String service,
                                      @RequestParam(required = false) BigDecimal minPrice,
                                      @RequestParam(required = false) BigDecimal maxPrice,
                                      @RequestParam(required = false) String sort) {
        return catalog.searchMenus(q, service, minPrice, maxPrice, sort);
    }

    @GetMapping("/menus/{slug}")
    public MenuDetailDto menu(@PathVariable String slug) {
        return catalog.menuDetail(slug);
    }

    @GetMapping("/addons")
    public List<AddonDto> addons() {
        return catalog.activeAddons();
    }
}
