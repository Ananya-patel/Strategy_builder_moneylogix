package com.moneylogix.strategybuilder.marketdata;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Profile("!cloud")
public class MarketDataConsumer {

    private final Map<String, List<OptionTick>> chainBuffer =
            new ConcurrentHashMap<>();

    private final StringRedisTemplate redis;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public MarketDataConsumer(StringRedisTemplate redis,
                               JdbcTemplate jdbc) {
        this.redis  = redis;
        this.jdbc   = jdbc;
        this.mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule());
    }

    @KafkaListener(topics = KafkaConfig.MARKET_TICKS_TOPIC,
                   groupId = "market-data-consumer")
    public void consume(String message) {
        try {
            OptionTick tick = mapper.readValue(message, OptionTick.class);

            chainBuffer.computeIfAbsent(tick.getSymbol(),
                    k -> new ArrayList<>()).add(tick);

            List<OptionTick> chain = chainBuffer.get(tick.getSymbol());
            if (chain.size() >= 18) {
                String key  = "chain:" + tick.getSymbol();
                String json = mapper.writeValueAsString(chain);
                redis.opsForValue().set(key, json, Duration.ofSeconds(30));
                log.debug("Flushed chain snapshot to Redis: {}", key);
                chain.clear();
            }

            jdbc.update("""
                INSERT INTO market_tick
                  (time, symbol, strike_price, option_type,
                   ltp, open_interest, implied_volatility, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                java.sql.Timestamp.from(tick.getTime()),
                tick.getSymbol(),
                tick.getStrikePrice(),
                tick.getOptionType(),
                tick.getLtp(),
                tick.getOpenInterest(),
                tick.getImpliedVolatility(),
                tick.getVolume()
            );

        } catch (Exception e) {
            log.error("Failed to process tick: {}", e.getMessage());
        }
    }
}