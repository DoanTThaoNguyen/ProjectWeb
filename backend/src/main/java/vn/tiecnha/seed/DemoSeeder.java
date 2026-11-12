package vn.tiecnha.seed;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.tiecnha.assignment.Assignment;
import vn.tiecnha.assignment.AssignmentRepository;
import vn.tiecnha.assignment.AssignmentTaskStatus;
import vn.tiecnha.auth.Role;
import vn.tiecnha.auth.User;
import vn.tiecnha.auth.UserRepository;
import vn.tiecnha.booking.*;
import vn.tiecnha.catalog.*;
import vn.tiecnha.common.SettingsService;
import vn.tiecnha.payment.Payment;
import vn.tiecnha.payment.PaymentRepository;
import vn.tiecnha.quote.Quote;
import vn.tiecnha.quote.QuoteItem;
import vn.tiecnha.quote.QuoteRepository;
import vn.tiecnha.quote.QuoteStatus;
import vn.tiecnha.staff.Skill;
import vn.tiecnha.staff.Staff;
import vn.tiecnha.staff.StaffRepository;

/**
 * Seed du lieu DEMO (chi bat o profile dev qua app.seed-demo=true). Chay lap lai an toan:
 * moi nhom du lieu chi tao khi bang tuong ung con trong. Ngay cua don mau tinh tuong doi theo ngay chay.
 * Moi gia, lien he, nhan su, don mau deu la du lieu gia lap.
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo", havingValue = "true")
public class DemoSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoSeeder.class);
    public static final String DEMO_PASSWORD = "Demo@123";

    private final UserRepository users;
    private final PartyServiceRepository services;
    private final DishCategoryRepository categories;
    private final DishRepository dishes;
    private final MenuRepository menus;
    private final AddonRepository addons;
    private final StaffRepository staff;
    private final BookingRepository bookings;
    private final StatusHistoryRepository history;
    private final QuoteRepository quotes;
    private final PaymentRepository payments;
    private final AssignmentRepository assignments;
    private final PasswordEncoder encoder;
    private final SettingsService settings;
    private final Clock clock;

    public DemoSeeder(UserRepository users, PartyServiceRepository services, DishCategoryRepository categories,
                      DishRepository dishes, MenuRepository menus, AddonRepository addons, StaffRepository staff,
                      BookingRepository bookings, StatusHistoryRepository history, QuoteRepository quotes,
                      PaymentRepository payments, AssignmentRepository assignments, PasswordEncoder encoder,
                      SettingsService settings, Clock clock) {
        this.users = users;
        this.services = services;
        this.categories = categories;
        this.dishes = dishes;
        this.menus = menus;
        this.addons = addons;
        this.staff = staff;
        this.bookings = bookings;
        this.history = history;
        this.quotes = quotes;
        this.payments = payments;
        this.assignments = assignments;
        this.encoder = encoder;
        this.settings = settings;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (services.count() == 0) seedCatalog();
        if (users.count() == 0) seedUsersAndStaff();
        if (bookings.count() == 0) seedBookings();
    }

    // ====================== CATALOG ======================

    private final Map<String, Dish> dishByName = new HashMap<>();

    private void seedCatalog() {
        PartyService tb = svc("TIEC_BAN", "Tiệc bàn truyền thống", "Mâm cỗ đủ vị cho giỗ, tân gia, thôi nôi, mừng thọ",
                "Bàn tiệc 10 người theo phong cách Việt: khai vị, món chính, lẩu và tráng miệng. Đầu bếp nấu tại bếp nhà bạn, phục vụ tận bàn và dọn dẹp sau tiệc.", 10, 1);
        PartyService bf = svc("BUFFET", "Buffet tại gia", "Tự chọn thoải mái cho tiệc đông người",
                "Quầy buffet setup ngay tại phòng khách hoặc sân nhà, có nhân viên châm món liên tục, phù hợp sinh nhật, họp mặt, tiệc công ty.", 20, 2);
        PartyService bbq = svc("BBQ", "Tiệc nướng BBQ", "Lửa than hồng, nướng tại chỗ",
                "Đội bếp mang bếp nướng, than và nguyên liệu tẩm ướp sẵn tới nhà bạn; nướng và phục vụ tại chỗ cho tiệc sân vườn, sân thượng.", 10, 3);
        PartyService tea = svc("TEABREAK", "Teabreak & tiệc nhẹ", "Bánh ngọt, finger food, trà & cà phê",
                "Bàn tiệc nhẹ cho hội thảo, khai trương, lễ ra mắt hoặc buổi gặp mặt; trình bày gọn đẹp, có nhân viên đứng quầy.", 20, 4);

        DishCategory kv = cat("Khai vị", 1), mc = cat("Món chính", 2), mn = cat("Món nướng", 3), lau = cat("Lẩu", 4),
                tm = cat("Tráng miệng", 5), du = cat("Đồ uống", 6), fb = cat("Bánh & finger food", 7);

        dish(kv, "Gỏi ngó sen tôm thịt", "Ngó sen giòn, tôm tươi, thịt ba chỉ, rau thơm");
        dish(kv, "Súp cua gà xé", "Súp nóng với thịt cua, gà xé và trứng cút");
        dish(kv, "Chả giò rế hải sản", "Vỏ rế giòn rụm, nhân tôm mực");
        dish(kv, "Salad cá hồi sốt mè rang", "Rau mầm, cá hồi áp chảo, sốt mè");
        dish(kv, "Nộm gà xé phay", "Gà ta xé phay, bắp cải, hành tây, chanh ớt");
        dish(mc, "Gà ta hấp lá chanh", "Gà ta thả vườn, chấm muối tiêu chanh");
        dish(mc, "Bò lúc lắc khoai tây", "Thăn bò Úc xào lửa lớn với ớt chuông");
        dish(mc, "Tôm sú rang muối", "Tôm sú lớn rang muối ớt");
        dish(mc, "Cá chẽm hấp xì dầu", "Cá chẽm nguyên con hấp gừng hành");
        dish(mc, "Sườn non rim mặn ngọt", "Sườn non rim nước dừa, tiêu đen");
        dish(mc, "Cua rang me", "Cua thịt chắc, sốt me chua ngọt");
        dish(mc, "Xôi gấc", "Xôi dẻo màu gấc, mè rang");
        dish(mc, "Cơm chiên hải sản", "Cơm chiên tôm mực, trứng, rau củ");
        dish(mc, "Mì Ý sốt bò bằm", "Spaghetti sốt cà chua bò bằm");
        dish(mc, "Đậu hũ non sốt nấm", "Món chay: đậu hũ non, nấm đông cô");
        dish(mc, "Rau củ xào thập cẩm", "Bông cải, cà rốt, đậu Hà Lan, nấm");
        dish(mn, "Ba chỉ heo nướng mật ong", "Ba chỉ ướp mật ong, sả, tỏi");
        dish(mn, "Sườn bò nướng BBQ", "Sườn bò Mỹ sốt BBQ khói");
        dish(mn, "Xiên gà nướng sa tế", "Đùi gà xiên rau củ, sa tế cay nhẹ");
        dish(mn, "Tôm càng nướng bơ tỏi", "Tôm càng xanh nướng bơ tỏi");
        dish(mn, "Mực ống nướng sa tế", "Mực ống tươi nướng than");
        dish(mn, "Hàu nướng mỡ hành", "Hàu sữa nướng mỡ hành đậu phộng");
        dish(mn, "Bắp nướng mỡ hành", "Bắp Mỹ nướng phết mỡ hành");
        dish(lau, "Lẩu Thái hải sản", "Nước lẩu chua cay, tôm mực nghêu");
        dish(lau, "Lẩu gà lá é", "Gà ta, lá é, nấm, bún tươi");
        dish(lau, "Lẩu nấm chay", "Nước dùng rau củ, các loại nấm");
        dish(tm, "Chè hạt sen long nhãn", "Hạt sen bùi, long nhãn ngọt thanh");
        dish(tm, "Trái cây theo mùa", "Dưa hấu, xoài, thanh long, nho");
        dish(tm, "Panna cotta chanh dây", "Kem sữa mềm, sốt chanh dây");
        dish(tm, "Bánh flan caramen", "Flan trứng sữa, caramen đắng nhẹ");
        dish(du, "Trà đào cam sả", "Trà đào tươi mát");
        dish(du, "Nước ép cam", "Cam vắt nguyên chất");
        dish(du, "Cà phê sữa đá", "Cà phê phin truyền thống");
        dish(du, "Trà hoa cúc mật ong", "Trà nóng thanh nhẹ");
        dish(fb, "Bánh su kem", "Su kem nhân vani");
        dish(fb, "Bánh tart trứng", "Vỏ giòn, nhân trứng béo");
        dish(fb, "Sandwich gà mini", "Bánh mì sandwich gà, rau xà lách");
        dish(fb, "Bánh mousse dâu", "Mousse dâu tây ly nhỏ");
        dish(fb, "Canapé cá hồi xông khói", "Bánh quy giòn, kem phô mai, cá hồi");
        dish(fb, "Bánh bò nướng lá dứa", "Bánh truyền thống thơm lá dứa");

        menu(tb, "Mâm Sum Vầy", "mam-sum-vay", "6 món quen thuộc cho bữa cơm gia đình đông đủ",
                "Thực đơn nhẹ nhàng, đậm vị nhà: gỏi giòn, gà hấp, sườn rim, lẩu gà lá é và chè ngọt.",
                "2990000", PriceUnit.TABLE, 10, 2, true, true,
                "Gỏi ngó sen tôm thịt", "Gà ta hấp lá chanh", "Sườn non rim mặn ngọt", "Rau củ xào thập cẩm", "Lẩu gà lá é", "Chè hạt sen long nhãn");
        menu(tb, "Mâm Phú Quý", "mam-phu-quy", "7 món sang trọng cho giỗ chạp, mừng thọ",
                "Mâm cỗ đầy đặn với súp cua, tôm rang muối, bò lúc lắc, cá hấp và lẩu Thái hải sản.",
                "3890000", PriceUnit.TABLE, 10, 2, true, true,
                "Súp cua gà xé", "Chả giò rế hải sản", "Tôm sú rang muối", "Bò lúc lắc khoai tây", "Cá chẽm hấp xì dầu", "Lẩu Thái hải sản", "Trái cây theo mùa");
        menu(tb, "Mâm Hải Vị", "mam-hai-vi", "8 món hải sản tươi cho dịp đặc biệt",
                "Dành cho tiệc tân gia, cưới hỏi nhỏ: cua rang me, tôm sú, hàu nướng, cá hấp, lẩu hải sản.",
                "4990000", PriceUnit.TABLE, 10, 2, false, true,
                "Salad cá hồi sốt mè rang", "Chả giò rế hải sản", "Cua rang me", "Tôm sú rang muối", "Hàu nướng mỡ hành", "Cá chẽm hấp xì dầu", "Lẩu Thái hải sản", "Panna cotta chanh dây");
        menu(tb, "Mâm Chay Thanh Tịnh", "mam-chay-thanh-tinh", "6 món chay thanh đạm",
                "Thực đơn chay cho ngày rằm, lễ cúng: đậu hũ sốt nấm, rau củ xào, lẩu nấm chay.",
                "2490000", PriceUnit.TABLE, 10, 2, false, true,
                "Nộm gà xé phay", "Đậu hũ non sốt nấm", "Rau củ xào thập cẩm", "Xôi gấc", "Lẩu nấm chay", "Trái cây theo mùa");
        menu(tb, "Mâm Xuân 2025", "mam-xuan-2025", "Thực đơn Tết năm trước (ngừng phục vụ)",
                "Thực đơn theo mùa đã ngừng phục vụ – dùng để minh họa việc không cho đặt thực đơn ngừng hoạt động.",
                "3290000", PriceUnit.TABLE, 10, 2, false, false,
                "Xôi gấc", "Gà ta hấp lá chanh", "Chè hạt sen long nhãn");
        menu(bf, "Buffet Gia Đình", "buffet-gia-dinh", "12 món Á – Âu, phù hợp sinh nhật & họp mặt",
                "Quầy buffet gồm khai vị, món chính, mì Ý, cơm chiên, tráng miệng và đồ uống.",
                "289000", PriceUnit.GUEST, null, 20, true, true,
                "Salad cá hồi sốt mè rang", "Chả giò rế hải sản", "Gà ta hấp lá chanh", "Bò lúc lắc khoai tây", "Mì Ý sốt bò bằm",
                "Cơm chiên hải sản", "Rau củ xào thập cẩm", "Bánh flan caramen", "Trái cây theo mùa", "Trà đào cam sả");
        menu(bf, "Buffet Hội Ngộ", "buffet-hoi-ngo", "15 món có hải sản & quầy nướng mini",
                "Buffet cao cấp với tôm, cua, hàu nướng và quầy tráng miệng đa dạng.",
                "389000", PriceUnit.GUEST, null, 30, false, true,
                "Súp cua gà xé", "Salad cá hồi sốt mè rang", "Tôm sú rang muối", "Cua rang me", "Hàu nướng mỡ hành", "Sườn bò nướng BBQ",
                "Cá chẽm hấp xì dầu", "Mì Ý sốt bò bằm", "Panna cotta chanh dây", "Bánh mousse dâu", "Trái cây theo mùa", "Nước ép cam");
        menu(bbq, "BBQ Sân Vườn", "bbq-san-vuon", "Thịt nướng than hoa cho tiệc ngoài trời",
                "Ba chỉ mật ong, xiên gà sa tế, sườn bò BBQ, bắp nướng, kèm rau cuốn và nước chấm nhà làm.",
                "329000", PriceUnit.GUEST, null, 10, true, true,
                "Ba chỉ heo nướng mật ong", "Xiên gà nướng sa tế", "Sườn bò nướng BBQ", "Bắp nướng mỡ hành", "Nộm gà xé phay", "Trái cây theo mùa", "Trà đào cam sả");
        menu(bbq, "BBQ Hải Sản", "bbq-hai-san", "Tôm, mực, hàu nướng tại chỗ",
                "Hải sản tươi nướng trên than: tôm càng bơ tỏi, mực sa tế, hàu mỡ hành, kèm lẩu Thái.",
                "459000", PriceUnit.GUEST, null, 10, false, true,
                "Tôm càng nướng bơ tỏi", "Mực ống nướng sa tế", "Hàu nướng mỡ hành", "Ba chỉ heo nướng mật ong", "Lẩu Thái hải sản", "Nước ép cam");
        menu(tea, "Teabreak Văn Phòng", "teabreak-van-phong", "6 món bánh + 2 loại đồ uống",
                "Gọn nhẹ cho hội thảo, đào tạo nội bộ: bánh ngọt, sandwich mini, trà và cà phê.",
                "89000", PriceUnit.GUEST, null, 20, false, true,
                "Bánh su kem", "Bánh tart trứng", "Sandwich gà mini", "Bánh bò nướng lá dứa", "Cà phê sữa đá", "Trà hoa cúc mật ong");
        menu(tea, "Teabreak Sự Kiện", "teabreak-su-kien", "10 món finger food trình bày sang trọng",
                "Cho khai trương, ra mắt sản phẩm: canapé cá hồi, mousse dâu, trái cây và quầy đồ uống.",
                "139000", PriceUnit.GUEST, null, 30, true, true,
                "Canapé cá hồi xông khói", "Bánh mousse dâu", "Bánh tart trứng", "Sandwich gà mini", "Chả giò rế hải sản",
                "Bánh su kem", "Trái cây theo mùa", "Nước ép cam", "Trà đào cam sả", "Cà phê sữa đá");

        addon("Trang trí bàn tiệc theo chủ đề", "Khăn bàn, hoa tươi, bong bóng theo chủ đề", "1500000", Addon.ChargeType.FIXED, "gói", 1);
        addon("Thuê bàn ghế & khăn trải", "Bàn tròn 10 người, ghế bọc nệm, khăn trải", "250000", Addon.ChargeType.PER_TABLE, "bàn", 2);
        addon("MC & âm thanh cơ bản", "MC dẫn chương trình + loa, micro", "2500000", Addon.ChargeType.FIXED, "buổi", 3);
        addon("Bánh kem 2 tầng", "Bánh kem tươi trang trí theo yêu cầu", "650000", Addon.ChargeType.FIXED, "chiếc", 4);
        addon("Nước ngọt & bia không giới hạn", "Nước ngọt, bia lon ướp lạnh trong suốt tiệc", "45000", Addon.ChargeType.PER_GUEST, "khách", 5);
        addon("Nhân viên phục vụ thêm", "Thêm 1 nhân viên phục vụ trong 4 giờ", "400000", Addon.ChargeType.FIXED, "người", 6);
        addon("Lều bạt sân vườn", "Lều 6x6m, đèn trang trí", "1800000", Addon.ChargeType.FIXED, "bộ", 7);
        log.info("Seeded demo catalog");
    }

    private PartyService svc(String code, String name, String tagline, String desc, int minGuests, int order) {
        PartyService s = new PartyService();
        s.setCode(code);
        s.setName(name);
        s.setTagline(tagline);
        s.setDescription(desc);
        s.setImage("/images/services/" + code.toLowerCase() + ".jpg");
        s.setMinGuests(minGuests);
        s.setSortOrder(order);
        return services.save(s);
    }

    private DishCategory cat(String name, int order) {
        DishCategory c = new DishCategory();
        c.setName(name);
        c.setSortOrder(order);
        return categories.save(c);
    }

    private void dish(DishCategory c, String name, String desc) {
        Dish d = new Dish();
        d.setCategory(c);
        d.setName(name);
        d.setDescription(desc);
        dishByName.put(name, dishes.save(d));
    }

    private void menu(PartyService s, String name, String slug, String summary, String desc, String price, PriceUnit unit,
                      Integer gpt, int minQty, boolean featured, boolean active, String... dishNames) {
        Menu m = new Menu();
        m.setService(s);
        m.setName(name);
        m.setSlug(slug);
        m.setSummary(summary);
        m.setDescription(desc);
        m.setImage("/images/menus/" + slug + ".jpg");
        m.setPrice(new BigDecimal(price));
        m.setPriceUnit(unit);
        m.setGuestsPerTable(gpt);
        m.setMinQuantity(minQty);
        m.setFeatured(featured);
        m.setActive(active);
        for (String n : dishNames) {
            Dish d = dishByName.get(n);
            if (d == null) throw new IllegalStateException("Missing dish " + n);
            m.getDishes().add(d);
        }
        menus.save(m);
    }

    private void addon(String name, String desc, String price, Addon.ChargeType type, String unit, int order) {
        Addon a = new Addon();
        a.setName(name);
        a.setDescription(desc);
        a.setPrice(new BigDecimal(price));
        a.setChargeType(type);
        a.setUnitLabel(unit);
        a.setSortOrder(order);
        addons.save(a);
    }

    // ====================== USERS & STAFF ======================

    private void seedUsersAndStaff() {
        user("admin@tiecnha.vn", "Quản trị viên", "0900000001", Role.ADMIN);
        user("dieuphoi@tiecnha.vn", "Lê Thu Hà (Điều phối)", "0900000002", Role.COORDINATOR);
        user("khach@tiecnha.vn", "Nguyễn Minh Anh", "0912345678", Role.CUSTOMER).setAddress("12 Nguyễn Văn Linh, Q.7, TP.HCM");
        user("khach2@tiecnha.vn", "Trần Quốc Bảo", "0987654321", Role.CUSTOMER).setAddress("45 Phan Xích Long, Phú Nhuận, TP.HCM");

        User u1 = user("bep.tuan@tiecnha.vn", "Phạm Văn Tuấn", "0901111001", Role.STAFF);
        User u2 = user("phucvu.lan@tiecnha.vn", "Võ Thị Lan", "0901111002", Role.STAFF);
        User u3 = user("setup.khoa@tiecnha.vn", "Đặng Minh Khoa", "0901111003", Role.STAFF);
        staffOf(u1, "Bếp trưởng 12 năm kinh nghiệm", Skill.CHEF);
        staffOf(u2, null, Skill.SERVER, Skill.SETUP);
        staffOf(u3, "Có bằng lái B2", Skill.SETUP, Skill.DRIVER);
        staffNoUser("Ngô Thị Hồng", "0901111004", "Chuyên món Âu", Skill.CHEF, Skill.ASSISTANT_CHEF);
        staffNoUser("Lý Văn Phúc", "0901111005", null, Skill.ASSISTANT_CHEF);
        staffNoUser("Bùi Thị Mai", "0901111006", null, Skill.ASSISTANT_CHEF, Skill.SERVER);
        staffNoUser("Huỳnh Gia Huy", "0901111007", null, Skill.SERVER);
        staffNoUser("Trịnh Ngọc Yến", "0901111008", null, Skill.SERVER);
        staffNoUser("Mai Văn Đức", "0901111009", null, Skill.DRIVER, Skill.SETUP);
        Staff off = staffNoUser("Cao Thị Thanh", "0901111010", "Nghỉ phép dài hạn", Skill.SERVER);
        off.setActive(false);
        staff.save(off);
        users.flush();
        log.info("Seeded demo users ({} / mật khẩu {})", "admin@tiecnha.vn, dieuphoi@, khach@, bep.tuan@ ...", DEMO_PASSWORD);
    }

    private User user(String email, String name, String phone, Role role) {
        User u = new User();
        u.setEmail(email);
        u.setFullName(name);
        u.setPhone(phone);
        u.setRole(role);
        u.setPasswordHash(encoder.encode(DEMO_PASSWORD));
        return users.save(u);
    }

    private void staffOf(User u, String note, Skill... skills) {
        Staff s = new Staff();
        s.setUserId(u.getId());
        s.setFullName(u.getFullName());
        s.setPhone(u.getPhone());
        s.setEmail(u.getEmail());
        s.setNote(note);
        s.getSkills().addAll(Arrays.asList(skills));
        staff.save(s);
    }

    private Staff staffNoUser(String name, String phone, String note, Skill... skills) {
        Staff s = new Staff();
        s.setFullName(name);
        s.setPhone(phone);
        s.setNote(note);
        s.getSkills().addAll(Arrays.asList(skills));
        return staff.save(s);
    }

    // ====================== BOOKINGS ======================

    private User coord;
    private int seq = 1;
    private int paySeq = 1;

    private void seedBookings() {
        User khach = users.findByEmailIgnoreCase("khach@tiecnha.vn").orElse(null);
        User khach2 = users.findByEmailIgnoreCase("khach2@tiecnha.vn").orElse(null);
        coord = users.findByEmailIgnoreCase("dieuphoi@tiecnha.vn").orElse(null);
        if (khach == null || khach2 == null || coord == null) return;
        Menu sumVay = menus.findBySlug("mam-sum-vay").orElseThrow();
        Menu phuQuy = menus.findBySlug("mam-phu-quy").orElseThrow();
        Menu buffet = menus.findBySlug("buffet-gia-dinh").orElseThrow();
        Menu bbq = menus.findBySlug("bbq-san-vuon").orElseThrow();
        Menu tea = menus.findBySlug("teabreak-su-kien").orElseThrow();
        Menu haiVi = menus.findBySlug("mam-hai-vi").orElseThrow();
        List<Addon> ad = addons.findAllByOrderBySortOrder();
        Addon decor = ad.get(0), tables = ad.get(1), mc = ad.get(2), cake = ad.get(3), drinks = ad.get(4);
        Map<String, Staff> st = new HashMap<>();
        staff.findAll().forEach(s -> st.put(s.getFullName(), s));
        LocalDate today = LocalDate.now(clock);

        // 1. Yeu cau moi
        Booking b1 = booking(khach, buffet, today.plusDays(12), LocalTime.of(18, 0), 4, "Nhà riêng, 12 Nguyễn Văn Linh, Q.7, TP.HCM",
                35, null, "Sinh nhật 40 tuổi của chồng, cần thêm bánh kem.", 12, cake);
        hist(b1, null, BookingStatus.NEW, khach, "Khách gửi yêu cầu đặt tiệc", 2);

        // 2. Dang tu van
        Booking b2 = booking(khach2, bbq, today.plusDays(9), LocalTime.of(17, 30), 4, "Sân thượng, 45 Phan Xích Long, Phú Nhuận",
                20, null, "Tiệc họp lớp, có 3 người ăn chay.", 10, drinks);
        hist(b2, null, BookingStatus.NEW, khach2, "Khách gửi yêu cầu đặt tiệc", 3);
        hist(b2, BookingStatus.NEW, BookingStatus.CONSULTING, coord, "Đã gọi điện tư vấn, khách cân nhắc thêm lều", 2);

        // 3. Da gui bao gia (cho khach chap nhan)
        Booking b3 = booking(khach, phuQuy, today.plusDays(15), LocalTime.of(11, 0), 3, "Nhà thờ họ, 88 Lê Văn Việt, TP. Thủ Đức",
                40, 4, "Đám giỗ ông nội, cúng lúc 10h.", 8, tables);
        hist(b3, null, BookingStatus.NEW, khach, "Khách gửi yêu cầu đặt tiệc", 4);
        hist(b3, BookingStatus.NEW, BookingStatus.CONSULTING, coord, null, 3);
        Quote q3 = quote(b3, 1, QuoteStatus.SENT, today.plusDays(6), 2, null);
        hist(b3, BookingStatus.CONSULTING, BookingStatus.QUOTED, coord, "Gửi báo giá phiên bản 1", 2);

        // 4. Cho coc
        Booking b4 = booking(khach2, tea, today.plusDays(6), LocalTime.of(14, 0), 2, "Văn phòng công ty, 2 Hải Triều, Q.1",
                60, null, "Khai trương chi nhánh mới.", 7, decor);
        hist(b4, null, BookingStatus.NEW, khach2, "Khách gửi yêu cầu đặt tiệc", 6);
        hist(b4, BookingStatus.NEW, BookingStatus.CONSULTING, coord, null, 5);
        Quote q4 = quote(b4, 1, QuoteStatus.ACCEPTED, today.plusDays(5), 4, khach2);
        hist(b4, BookingStatus.CONSULTING, BookingStatus.QUOTED, coord, "Gửi báo giá phiên bản 1", 4);
        hist(b4, BookingStatus.QUOTED, BookingStatus.AWAITING_DEPOSIT, khach2, "Khách chấp nhận báo giá v1", 3);
        b4.setAcceptedQuoteId(q4.getId());
        b4.setStatus(BookingStatus.AWAITING_DEPOSIT);

        // 5. Da xac nhan + da coc + da phan cong (ngay +3, 11h-14h)
        Booking b5 = booking(khach, sumVay, today.plusDays(3), LocalTime.of(11, 0), 3, "12 Nguyễn Văn Linh, Q.7, TP.HCM",
                30, 3, "Tiệc tân gia.", 10, decor, tables);
        hist(b5, null, BookingStatus.NEW, khach, "Khách gửi yêu cầu đặt tiệc", 9);
        hist(b5, BookingStatus.NEW, BookingStatus.CONSULTING, coord, null, 8);
        Quote q5 = quote(b5, 1, QuoteStatus.SUPERSEDED, today.plusDays(1), 7, null);
        hist(b5, BookingStatus.CONSULTING, BookingStatus.QUOTED, coord, "Gửi báo giá phiên bản 1", 7);
        Quote q5b = quote(b5, 2, QuoteStatus.ACCEPTED, today.plusDays(4), 6, khach);
        hist(b5, BookingStatus.QUOTED, BookingStatus.QUOTED, coord, "Gửi báo giá phiên bản 2 (khách thêm trang trí)", 6);
        hist(b5, BookingStatus.QUOTED, BookingStatus.AWAITING_DEPOSIT, khach, "Khách chấp nhận báo giá v2", 5);
        b5.setAcceptedQuoteId(q5b.getId());
        pay(b5, Payment.Type.DEPOSIT, q5b.getDepositAmount(), Payment.Method.BANK_TRANSFER, "VCB-FT2611" + seq, 4);
        hist(b5, BookingStatus.AWAITING_DEPOSIT, BookingStatus.CONFIRMED, coord, "Đã nhận đủ cọc", 4);
        b5.setStatus(BookingStatus.CONFIRMED);
        b5.setPaymentStatus(PaymentStatus.DEPOSIT_PAID);
        assign(b5, st.get("Phạm Văn Tuấn"), Skill.CHEF, "Bếp chính – nấu toàn bộ thực đơn", AssignmentTaskStatus.CONFIRMED);
        assign(b5, st.get("Lý Văn Phúc"), Skill.ASSISTANT_CHEF, "Sơ chế, phụ bếp", AssignmentTaskStatus.ASSIGNED);
        assign(b5, st.get("Võ Thị Lan"), Skill.SERVER, "Phục vụ bàn 1-2, bày món", AssignmentTaskStatus.ASSIGNED);
        assign(b5, st.get("Đặng Minh Khoa"), Skill.SETUP, "Chở dụng cụ, setup bàn ghế & trang trí", AssignmentTaskStatus.ASSIGNED);
        b5.setAssignmentStatus(AssignmentStatus.ASSIGNED);

        // 6. Da xac nhan, CHUA phan cong, trung gio voi don 5 -> dung de thu chan trung lich
        Booking b6 = booking(khach2, haiVi, today.plusDays(3), LocalTime.of(12, 0), 3, "Biệt thự 9 Thảo Điền, TP. Thủ Đức",
                20, 2, "Tiệc đính hôn nhỏ. (Đơn mẫu để thử chặn trùng lịch: trùng giờ với đơn của khách Minh Anh)", 9, decor);
        hist(b6, null, BookingStatus.NEW, khach2, "Khách gửi yêu cầu đặt tiệc", 8);
        Quote q6 = quote(b6, 1, QuoteStatus.ACCEPTED, today.plusDays(5), 6, khach2);
        hist(b6, BookingStatus.NEW, BookingStatus.QUOTED, coord, "Gửi báo giá phiên bản 1", 6);
        hist(b6, BookingStatus.QUOTED, BookingStatus.AWAITING_DEPOSIT, khach2, "Khách chấp nhận báo giá v1", 5);
        b6.setAcceptedQuoteId(q6.getId());
        pay(b6, Payment.Type.DEPOSIT, q6.getDepositAmount(), Payment.Method.CASH, null, 4);
        hist(b6, BookingStatus.AWAITING_DEPOSIT, BookingStatus.CONFIRMED, coord, "Đã nhận đủ cọc", 4);
        b6.setStatus(BookingStatus.CONFIRMED);
        b6.setPaymentStatus(PaymentStatus.DEPOSIT_PAID);

        // 7. Dang thuc hien (hom nay)
        Booking b7 = booking(khach2, buffet, today, LocalTime.of(18, 30), 3, "Chung cư Sunrise, 23 Nguyễn Hữu Thọ, Q.7",
                25, null, "Tiệc mừng thăng chức.", 14, drinks);
        hist(b7, null, BookingStatus.NEW, khach2, "Khách gửi yêu cầu đặt tiệc", 14);
        Quote q7 = quote(b7, 1, QuoteStatus.ACCEPTED, today.minusDays(5), 12, khach2);
        hist(b7, BookingStatus.NEW, BookingStatus.QUOTED, coord, "Gửi báo giá phiên bản 1", 12);
        hist(b7, BookingStatus.QUOTED, BookingStatus.AWAITING_DEPOSIT, khach2, "Khách chấp nhận báo giá v1", 11);
        b7.setAcceptedQuoteId(q7.getId());
        pay(b7, Payment.Type.DEPOSIT, q7.getDepositAmount(), Payment.Method.BANK_TRANSFER, "ACB-" + seq, 10);
        hist(b7, BookingStatus.AWAITING_DEPOSIT, BookingStatus.CONFIRMED, coord, "Đã nhận đủ cọc", 10);
        hist(b7, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, coord, "Đội bếp đã xuất phát", 0);
        b7.setStatus(BookingStatus.IN_PROGRESS);
        b7.setPaymentStatus(PaymentStatus.DEPOSIT_PAID);
        assign(b7, st.get("Ngô Thị Hồng"), Skill.CHEF, "Bếp chính buffet", AssignmentTaskStatus.IN_PROGRESS);
        assign(b7, st.get("Bùi Thị Mai"), Skill.ASSISTANT_CHEF, "Phụ bếp, châm món", AssignmentTaskStatus.IN_PROGRESS);
        assign(b7, st.get("Võ Thị Lan"), Skill.SERVER, "Đứng quầy đồ uống", AssignmentTaskStatus.CONFIRMED);
        assign(b7, st.get("Mai Văn Đức"), Skill.DRIVER, "Vận chuyển dụng cụ buffet", AssignmentTaskStatus.DONE);
        b7.setAssignmentStatus(AssignmentStatus.ASSIGNED);

        // 8. Hoan tat (5 ngay truoc) - da thu du
        Booking b8 = booking(khach, phuQuy, today.minusDays(5), LocalTime.of(11, 0), 3, "12 Nguyễn Văn Linh, Q.7, TP.HCM",
                50, 5, "Mừng thọ bà ngoại 80 tuổi.", 25, decor, mc);
        completed(b8, khach, 25, st, "Phạm Văn Tuấn", "Lý Văn Phúc", "Võ Thị Lan", "Đặng Minh Khoa");

        // 9. Hoan tat (thang truoc)
        Booking b9 = booking(khach2, bbq, today.minusDays(24), LocalTime.of(17, 0), 4, "45 Phan Xích Long, Phú Nhuận",
                30, null, "Tiệc cuối năm của nhóm bạn.", 40, drinks);
        completed(b9, khach2, 40, st, "Ngô Thị Hồng", "Bùi Thị Mai", "Huỳnh Gia Huy", "Mai Văn Đức");

        // 10. Khach huy truoc khi bao gia
        Booking b10 = booking(khach, tea, today.plusDays(20), LocalTime.of(9, 0), 2, "Tòa nhà Bitexco, Q.1",
                40, null, "Hội thảo nội bộ.", 6);
        hist(b10, null, BookingStatus.NEW, khach, "Khách gửi yêu cầu đặt tiệc", 6);
        hist(b10, BookingStatus.NEW, BookingStatus.CANCELLED, khach, "Khách hủy: Công ty đổi lịch hội thảo", 5);
        b10.setStatus(BookingStatus.CANCELLED);
        b10.setCancelReason("Công ty đổi lịch hội thảo");
        b10.setCancelledBy(khach.getId());
        b10.setCancelledAt(at(5));

        // 11. Huy sau khi da coc -> co hoan tien mot phan
        Booking b11 = booking(khach2, sumVay, today.plusDays(8), LocalTime.of(11, 0), 3, "45 Phan Xích Long, Phú Nhuận",
                20, 2, "Tiệc thôi nôi.", 12);
        hist(b11, null, BookingStatus.NEW, khach2, "Khách gửi yêu cầu đặt tiệc", 12);
        Quote q11 = quote(b11, 1, QuoteStatus.ACCEPTED, today.minusDays(3), 10, khach2);
        hist(b11, BookingStatus.NEW, BookingStatus.QUOTED, coord, "Gửi báo giá phiên bản 1", 10);
        hist(b11, BookingStatus.QUOTED, BookingStatus.AWAITING_DEPOSIT, khach2, "Khách chấp nhận báo giá v1", 9);
        b11.setAcceptedQuoteId(q11.getId());
        pay(b11, Payment.Type.DEPOSIT, q11.getDepositAmount(), Payment.Method.BANK_TRANSFER, "TCB-" + seq, 8);
        hist(b11, BookingStatus.AWAITING_DEPOSIT, BookingStatus.CONFIRMED, coord, "Đã nhận đủ cọc", 8);
        hist(b11, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, coord, "Khách yêu cầu hủy do gia đình có việc; hoàn 50% cọc", 2);
        pay(b11, Payment.Type.REFUND, q11.getDepositAmount().divide(BigDecimal.valueOf(2)), Payment.Method.BANK_TRANSFER, "TCB-RF-" + seq, 1);
        b11.setStatus(BookingStatus.CANCELLED);
        b11.setPaymentStatus(PaymentStatus.REFUNDED);
        b11.setCancelReason("Gia đình có việc đột xuất");
        b11.setCancelledBy(coord.getId());
        b11.setCancelledAt(at(2));

        bookings.saveAll(List.of(b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11));
        log.info("Seeded {} demo bookings", 11);
        Objects.requireNonNull(q3);
        Objects.requireNonNull(q5);
    }

    private void completed(Booking b, User cust, int ageDays, Map<String, Staff> st, String chef, String asst, String server, String setup) {
        hist(b, null, BookingStatus.NEW, cust, "Khách gửi yêu cầu đặt tiệc", ageDays);
        Quote q = quote(b, 1, QuoteStatus.ACCEPTED, b.getStartTime().toLocalDate().minusDays(5), ageDays - 2, cust);
        hist(b, BookingStatus.NEW, BookingStatus.QUOTED, coord, "Gửi báo giá phiên bản 1", ageDays - 2);
        hist(b, BookingStatus.QUOTED, BookingStatus.AWAITING_DEPOSIT, cust, "Khách chấp nhận báo giá v1", ageDays - 3);
        b.setAcceptedQuoteId(q.getId());
        pay(b, Payment.Type.DEPOSIT, q.getDepositAmount(), Payment.Method.BANK_TRANSFER, "VCB-" + seq, ageDays - 4);
        hist(b, BookingStatus.AWAITING_DEPOSIT, BookingStatus.CONFIRMED, coord, "Đã nhận đủ cọc", ageDays - 4);
        long daysAgo = java.time.temporal.ChronoUnit.DAYS.between(b.getStartTime().toLocalDate(), LocalDate.now(clock));
        int d = (int) daysAgo;
        hist(b, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, coord, null, d);
        pay(b, Payment.Type.BALANCE, q.getTotal().subtract(q.getDepositAmount()), Payment.Method.CASH, null, d);
        hist(b, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, coord, "Tiệc diễn ra tốt, khách đã thanh toán đủ", d);
        b.setStatus(BookingStatus.COMPLETED);
        b.setPaymentStatus(PaymentStatus.PAID);
        assign(b, st.get(chef), Skill.CHEF, "Bếp chính", AssignmentTaskStatus.DONE);
        assign(b, st.get(asst), Skill.ASSISTANT_CHEF, "Phụ bếp", AssignmentTaskStatus.DONE);
        assign(b, st.get(server), Skill.SERVER, "Phục vụ", AssignmentTaskStatus.DONE);
        assign(b, st.get(setup), Skill.SETUP, "Setup & thu dọn", AssignmentTaskStatus.DONE);
        b.setAssignmentStatus(AssignmentStatus.DONE);
    }

    private LocalDateTime at(int daysAgo) {
        return LocalDateTime.now(clock).minusDays(daysAgo).withSecond(0).withNano(0);
    }

    private Booking booking(User cust, Menu m, LocalDate day, LocalTime start, int hours, String address, int guests, Integer tableCount,
                            String note, int ageDays, Addon... ads) {
        List<PriceCalculator.AddonChoice> choices = Arrays.stream(ads).map(a -> new PriceCalculator.AddonChoice(a, 1)).toList();
        PriceCalculator.Estimate est = PriceCalculator.estimate(m, guests, tableCount, choices);
        Booking b = new Booking();
        b.setCode(String.format("TNDEMO%02d", seq++));
        b.setCustomer(cust);
        b.setContactName(cust.getFullName());
        b.setContactPhone(cust.getPhone());
        b.setService(m.getService());
        b.setMenu(m);
        b.setStartTime(day.atTime(start));
        b.setEndTime(day.atTime(start).plusHours(hours));
        b.setAddress(address);
        b.setGuestCount(guests);
        b.setTableCount(est.tableCount());
        b.setNote(note);
        b.setMenuNameSnapshot(m.getName());
        b.setMenuPriceSnapshot(m.getPrice());
        b.setMenuUnitSnapshot(m.getPriceUnit().name());
        b.setEstimatedTotal(est.total());
        for (Addon a : ads) {
            BookingAddon ba = new BookingAddon();
            ba.setAddonId(a.getId());
            ba.setAddonName(a.getName());
            ba.setQuantity(1);
            ba.setUnitPrice(a.getPrice());
            ba.setChargeType(a.getChargeType().name());
            b.getAddons().add(ba);
        }
        b.setCreatedAt(at(ageDays));
        bookings.saveAndFlush(b);
        return b;
    }

    private void hist(Booking b, BookingStatus from, BookingStatus to, User by, String note, int daysAgo) {
        StatusHistory h = new StatusHistory();
        h.setBookingId(b.getId());
        h.setFromStatus(from);
        h.setToStatus(to);
        h.setChangedBy(by.getId());
        h.setNote(note);
        h.setCreatedAt(at(Math.max(daysAgo, 0)));
        history.save(h);
        if (to != null) b.setStatus(to);
    }

    /** Bao gia mau: dong thuc don + dich vu bo sung + phi di chuyen; coc theo % cau hinh. */
    private Quote quote(Booking b, int version, QuoteStatus status, LocalDate validUntil, int sentDaysAgo, User acceptedBy) {
        Quote q = new Quote();
        q.setBookingId(b.getId());
        q.setVersionNo(version);
        q.setStatus(status);
        q.setCreatedBy(coord.getId());
        q.setValidUntil(validUntil);
        q.setSentAt(at(sentDaysAgo));
        q.setTerms("Giá đã bao gồm nguyên liệu, nhân sự nấu và phục vụ. Cọc " + settings.depositPercent() + "% để giữ lịch.");
        boolean byTable = "TABLE".equals(b.getMenuUnitSnapshot());
        int qty = byTable ? b.getTableCount() : b.getGuestCount();
        int i = 0;
        BigDecimal total = BigDecimal.ZERO;
        total = total.add(item(q, QuoteItem.ItemType.MENU, "Thực đơn " + b.getMenuNameSnapshot(), qty, byTable ? "bàn" : "khách", b.getMenuPriceSnapshot(), i++));
        for (BookingAddon a : b.getAddons()) {
            int aq = switch (a.getChargeType()) {
                case "PER_GUEST" -> b.getGuestCount();
                case "PER_TABLE" -> b.getTableCount() != null ? b.getTableCount() : (int) Math.ceil(b.getGuestCount() / 10.0);
                default -> a.getQuantity();
            };
            total = total.add(item(q, QuoteItem.ItemType.ADDON, a.getAddonName(), aq, "gói", a.getUnitPrice(), i++));
        }
        total = total.add(item(q, QuoteItem.ItemType.FEE, "Phí di chuyển & nhân sự phục vụ", 1, "gói", new BigDecimal(version == 1 ? "500000" : "400000"), i++));
        if (version == 2) {
            total = total.add(item(q, QuoteItem.ItemType.DISCOUNT, "Ưu đãi khách quen", 1, "lần", new BigDecimal("300000"), i));
        }
        q.setSubtotal(q.getItems().stream().map(QuoteItem::getAmount).filter(a -> a.signum() > 0).reduce(BigDecimal.ZERO, BigDecimal::add));
        q.setTotal(total);
        q.setDepositAmount(total.multiply(BigDecimal.valueOf(settings.depositPercent()))
                .divide(BigDecimal.valueOf(100), -3, java.math.RoundingMode.HALF_UP).setScale(0));
        if (acceptedBy != null && status == QuoteStatus.ACCEPTED) {
            q.setAcceptedAt(at(Math.max(sentDaysAgo - 1, 0)));
            q.setAcceptedBy(acceptedBy.getId());
        }
        return quotes.save(q);
    }

    private BigDecimal item(Quote q, QuoteItem.ItemType type, String desc, int qty, String unit, BigDecimal price, int order) {
        QuoteItem it = new QuoteItem();
        it.setQuote(q);
        it.setItemType(type);
        it.setDescription(desc);
        it.setQuantity(BigDecimal.valueOf(qty));
        it.setUnit(unit);
        it.setUnitPrice(price);
        BigDecimal amount = price.multiply(BigDecimal.valueOf(qty));
        if (type == QuoteItem.ItemType.DISCOUNT) amount = amount.negate();
        it.setAmount(amount);
        it.setSortOrder(order);
        q.getItems().add(it);
        return amount;
    }

    private void pay(Booking b, Payment.Type type, BigDecimal amount, Payment.Method method, String ref, int daysAgo) {
        Payment p = new Payment();
        p.setBookingId(b.getId());
        p.setType(type);
        p.setAmount(amount);
        p.setMethod(method);
        p.setReferenceCode(ref);
        p.setPaidAt(at(Math.max(daysAgo, 0)));
        p.setRecordedBy(coord.getId());
        p.setIdempotencyKey("seed-" + b.getCode() + "-" + type + "-" + (paySeq++));
        payments.save(p);
    }

    private void assign(Booking b, Staff s, Skill role, String task, AssignmentTaskStatus status) {
        Assignment a = new Assignment();
        a.setBooking(b);
        a.setStaff(s);
        a.setTaskRole(role);
        a.setTask(task);
        a.setShiftStart(b.getStartTime().minusMinutes(settings.prepMinutes()));
        a.setShiftEnd(b.getEndTime().plusMinutes(settings.teardownMinutes()));
        a.setStatus(status);
        a.setCreatedBy(coord.getId());
        assignments.save(a);
    }
}
