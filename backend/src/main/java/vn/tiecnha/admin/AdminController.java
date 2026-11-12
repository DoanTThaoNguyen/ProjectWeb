package vn.tiecnha.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.tiecnha.admin.AdminService.*;
import vn.tiecnha.admin.CatalogAdminService.*;
import vn.tiecnha.auth.Role;
import vn.tiecnha.catalog.CatalogDtos.*;
import vn.tiecnha.common.PageResponse;
import vn.tiecnha.common.SettingsService;
import vn.tiecnha.staff.StaffService;
import vn.tiecnha.staff.StaffService.StaffDto;
import vn.tiecnha.staff.StaffService.StaffInput;

/** API quan tri (chi ADMIN; chan o SecurityConfig: /api/admin/**). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService admin;
    private final CatalogAdminService catalog;
    private final StaffService staff;

    public AdminController(AdminService admin, CatalogAdminService catalog, StaffService staff) {
        this.admin = admin;
        this.catalog = catalog;
        this.staff = staff;
    }

    // ---------- Tai khoan ----------

    @GetMapping("/users")
    public PageResponse<UserRow> users(@RequestParam(required = false) String q, @RequestParam(required = false) Role role,
                                       @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return admin.listUsers(q, role, page, size);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserRow createUser(@Valid @RequestBody CreateUser in) {
        return admin.create(in);
    }

    @PutMapping("/users/{id}")
    public UserRow updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUser in) {
        return admin.update(id, in);
    }

    // ---------- Nhan vien ----------

    @PostMapping("/staff")
    @ResponseStatus(HttpStatus.CREATED)
    public StaffDto createStaff(@Valid @RequestBody StaffInput in) {
        return staff.create(in);
    }

    @PutMapping("/staff/{id}")
    public StaffDto updateStaff(@PathVariable Long id, @Valid @RequestBody StaffInput in) {
        return staff.update(id, in);
    }

    // ---------- Danh muc ----------

    @GetMapping("/menus")
    public List<MenuSummaryDto> menus() {
        return catalog.allMenus();
    }

    @GetMapping("/menus/{id}")
    public MenuDetailDto menu(@PathVariable Long id) {
        return catalog.menu(id);
    }

    @PostMapping("/menus")
    @ResponseStatus(HttpStatus.CREATED)
    public MenuDetailDto createMenu(@Valid @RequestBody MenuInput in) {
        return catalog.saveMenu(null, in);
    }

    @PutMapping("/menus/{id}")
    public MenuDetailDto updateMenu(@PathVariable Long id, @Valid @RequestBody MenuInput in) {
        return catalog.saveMenu(id, in);
    }

    @GetMapping("/dishes")
    public List<DishDto> dishes() {
        return catalog.allDishes();
    }

    @PostMapping("/dishes")
    @ResponseStatus(HttpStatus.CREATED)
    public DishDto createDish(@Valid @RequestBody DishInput in) {
        return catalog.saveDish(null, in);
    }

    @PutMapping("/dishes/{id}")
    public DishDto updateDish(@PathVariable Long id, @Valid @RequestBody DishInput in) {
        return catalog.saveDish(id, in);
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalog.allCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@Valid @RequestBody CategoryInput in) {
        return catalog.saveCategory(null, in);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryInput in) {
        return catalog.saveCategory(id, in);
    }

    @GetMapping("/addons")
    public List<AddonDto> addons() {
        return catalog.allAddons();
    }

    @PostMapping("/addons")
    @ResponseStatus(HttpStatus.CREATED)
    public AddonDto createAddon(@Valid @RequestBody AddonInput in) {
        return catalog.saveAddon(null, in);
    }

    @PutMapping("/addons/{id}")
    public AddonDto updateAddon(@PathVariable Long id, @Valid @RequestBody AddonInput in) {
        return catalog.saveAddon(id, in);
    }

    @GetMapping("/services")
    public List<ServiceDto> services() {
        return catalog.allServices();
    }

    @PutMapping("/services/{id}")
    public ServiceDto updateService(@PathVariable Long id, @Valid @RequestBody ServiceInput in) {
        return catalog.saveService(id, in);
    }

    // ---------- Cau hinh & nhat ky ----------

    @GetMapping("/settings")
    public List<SettingsService.Setting> settings() {
        return admin.settings();
    }

    public record SettingInput(@NotBlank(message = "Nhập giá trị") String value) {}

    @PutMapping("/settings/{key}")
    public List<SettingsService.Setting> updateSetting(@PathVariable String key, @Valid @RequestBody SettingInput in) {
        return admin.updateSetting(key, in.value());
    }

    @GetMapping("/audit")
    public PageResponse<AuditRow> audit(@RequestParam(required = false) String q, @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return admin.audit(q, page, size);
    }
}
