package com.moneylogix.strategybuilder.marketdata;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptionTick {
    private Instant time;
    private String symbol;
    private BigDecimal strikePrice;
    private String optionType;
    private BigDecimal ltp;
    private Long openInterest;
    private BigDecimal impliedVolatility;
    private Long volume;
}