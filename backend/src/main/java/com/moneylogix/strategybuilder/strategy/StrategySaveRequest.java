package com.moneylogix.strategybuilder.strategy;

import java.util.List;

public record StrategySaveRequest(
    String name,
    String underlyingSymbol,
    List<LegRequest> legs
) {
    public record LegRequest(
        String optionType,
        String action,
        double strikePrice,
        String expiryDate,
        int quantity,
        double premium
    ) {}
}
