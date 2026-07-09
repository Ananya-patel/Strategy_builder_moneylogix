package com.moneylogix.strategybuilder.strategy;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;
@RestController
@RequestMapping("/api/strategy")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
@RequiredArgsConstructor
public class StrategySaveController {
    private final JdbcTemplate jdbc;
    private static final UUID DEMO_USER = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> save(@RequestBody StrategySaveRequest req) {
        UUID strategyId = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("INSERT INTO strategy (id, user_id, name, underlying_symbol, status, created_at, updated_at) VALUES (?,?,?,?,'SAVED',?,?)",
                strategyId, DEMO_USER, req.name(), req.underlyingSymbol(),
                java.sql.Timestamp.from(now), java.sql.Timestamp.from(now));
        for (StrategySaveRequest.LegRequest leg : req.legs()) {
            jdbc.update("INSERT INTO strategy_leg (id, strategy_id, option_type, action, strike_price, expiry_date, quantity, premium, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                    UUID.randomUUID(), strategyId,
                    leg.optionType().toUpperCase(), leg.action().toUpperCase(),
                    leg.strikePrice(), java.sql.Date.valueOf(leg.expiryDate()),
                    leg.quantity(), leg.premium(), java.sql.Timestamp.from(now));
        }
        return ResponseEntity.ok(Map.of("strategyId", strategyId, "status", "SAVED"));
    }

    @GetMapping("/my-strategies")
    public ResponseEntity<List<Map<String, Object>>> list() {
        List<Map<String, Object>> strategies = jdbc.queryForList(
                "SELECT id, name, underlying_symbol, status, created_at FROM strategy WHERE user_id = ? ORDER BY created_at DESC",
                DEMO_USER);
        return ResponseEntity.ok(strategies);
    }
}
