package com.moneylogix.strategybuilder.marketdata;

import java.util.List;

public interface MarketDataProvider {
    List<OptionTick> fetchChain(String symbol);
    String name();
}