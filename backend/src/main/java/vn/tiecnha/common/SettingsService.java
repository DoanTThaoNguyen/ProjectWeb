package vn.tiecnha.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Cau hinh demo luu trong bang app_settings (phut chuan bi, thu don, % coc...). */
@Service
public class SettingsService {
    private final JdbcTemplate jdbc;

    public SettingsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int getInt(String key, int def) {
        var list = jdbc.queryForList("SELECT setting_value FROM app_settings WHERE setting_key = ?", String.class, key);
        if (list.isEmpty()) return def;
        try {
            return Integer.parseInt(list.get(0).trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    public int prepMinutes() { return getInt("prep_minutes", 180); }
    public int teardownMinutes() { return getInt("teardown_minutes", 90); }
    public int depositPercent() { return getInt("deposit_percent", 30); }
    public int quoteValidDays() { return getInt("quote_valid_days", 7); }
    public int minLeadHours() { return getInt("min_lead_hours", 24); }

    public record Setting(String key, String value, String description) {}

    public java.util.List<Setting> all() {
        return jdbc.query("SELECT setting_key, setting_value, description FROM app_settings ORDER BY setting_key",
                (rs, i) -> new Setting(rs.getString(1), rs.getString(2), rs.getString(3)));
    }

    public void update(String key, String value) {
        int n = jdbc.update("UPDATE app_settings SET setting_value = ? WHERE setting_key = ?", value, key);
        if (n == 0) throw ApiException.notFound("cấu hình " + key);
    }

    public Map<String, Integer> publicConfig() {
        Map<String, Integer> m = new LinkedHashMap<>();
        m.put("minLeadHours", minLeadHours());
        m.put("depositPercent", depositPercent());
        return m;
    }
}
