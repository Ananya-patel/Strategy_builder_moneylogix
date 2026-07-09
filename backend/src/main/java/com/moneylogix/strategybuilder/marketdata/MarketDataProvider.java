package com.moneylogix.strategybuilder.marketdata;

// backend/.../marketdata/MarketDataProvider.java
import java.util.List;

public interface MarketDataProvider {
    List<OptionTick> fetchChain(String symbol);  // your producer already calls this
    double getSpot(String symbol);               // new — for real spot
    double getHistVol(String symbol);            // new — for real volatility
}
