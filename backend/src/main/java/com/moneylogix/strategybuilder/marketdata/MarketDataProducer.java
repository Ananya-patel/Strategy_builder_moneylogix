package com.moneylogix.strategybuilder.marketdata;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@EnableScheduling
public class MarketDataProducer {

    private static final String SYMBOL = "NIFTY";

    private final MarketDataProvider provider;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper mapper;

    public MarketDataProducer(MarketDataProvider provider,
                               KafkaTemplate<String, String> kafkaTemplate) {
        this.provider      = provider;
        this.kafkaTemplate = kafkaTemplate;
        this.mapper        = new ObjectMapper()
                .registerModule(new JavaTimeModule());
    }

    @Scheduled(fixedDelay = 3000)
    public void publishTicks() {
        List<OptionTick> ticks = provider.fetchChain(SYMBOL);
        for (OptionTick tick : ticks) {
            try {
                String json = mapper.writeValueAsString(tick);
                kafkaTemplate.send(KafkaConfig.MARKET_TICKS_TOPIC,
                        tick.getSymbol(), json);
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize tick: {}", e.getMessage());
            }
        }
        log.debug("Published {} ticks for {}", ticks.size(), SYMBOL);
    }
}