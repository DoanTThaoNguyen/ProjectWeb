package vn.tiecnha.common;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Ghi lich su thao tac (audit_logs). */
@Service
public class AuditService {
    private final JdbcTemplate jdbc;

    public AuditService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void log(Long actorId, String action, String entity, Long entityId, String detail) {
        jdbc.update("INSERT INTO audit_logs(actor_id, action, entity, entity_id, detail) VALUES (?,?,?,?,?)",
                actorId, action, entity, entityId, detail == null ? null : detail.substring(0, Math.min(detail.length(), 1000)));
    }
}
