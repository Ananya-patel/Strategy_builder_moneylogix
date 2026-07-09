package com.moneylogix.strategybuilder.marketdata;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!live")   // active by default; disabled when the "live" profile is on
public class MockMarketDataProvider implements MarketDataProvider {

    private static final Random RNG = new Random();
    private double spotPrice = 24500.0;

    @Override
    public List<OptionTick> fetchChain(String symbol) {
        spotPrice = spotPrice * (1 + (RNG.nextDouble() - 0.5) * 0.006);
        List<OptionTick> ticks = new ArrayList<>();
        int[] offsets = {-400, -300, -200, -100, 0, 100, 200, 300, 400};
        for (int offset : offsets) {
            double strike = Math.round((spotPrice + offset) / 50.0) * 50.0;
            ticks.add(buildTick(symbol, strike, "CALL", spotPrice));
            ticks.add(buildTick(symbol, strike, "PUT", spotPrice));
        }
        return ticks;
    }

    // NEW — satisfies the interface. Mock just returns its simulated spot.
    @Override
    public double getSpot(String symbol) {
        return spotPrice;
    }

    // NEW — satisfies the interface. Mock returns a fixed assumed volatility.
    @Override
    public double getHistVol(String symbol) {
        return 0.15;
    }

    private OptionTick buildTick(String symbol, double strike,
                                  String type, double spot) {
        double baseIv = 0.18 + RNG.nextDouble() * 0.06;
        double ltp    = blackScholesApprox(spot, strike, baseIv, type);
        return OptionTick.builder()
                .time(Instant.now())
                .symbol(symbol)
                .strikePrice(bd(strike))
                .optionType(type)
                .ltp(bd(Math.max(ltp, 0.05)))
                .impliedVolatility(bd(baseIv * 100))
                .openInterest((long)(RNG.nextInt(50000) + 1000))
                .volume((long)(RNG.nextInt(10000) + 100))
                .build();
    }

    private double blackScholesApprox(double S, double K,
                                       double iv, String type) {
        double T  = 21.0 / 252.0;
        double r  = 0.065;
        double d1 = (Math.log(S / K) + (r + 0.5 * iv * iv) * T)
                     / (iv * Math.sqrt(T));
        double d2 = d1 - iv * Math.sqrt(T);
        if ("CALL".equals(type)) {
            return S * norm(d1) - K * Math.exp(-r * T) * norm(d2);
        } else {
            return K * Math.exp(-r * T) * norm(-d2) - S * norm(-d1);
        }
    }

    private double norm(double x) {
        double t    = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
        double poly = t * (0.319381530
                + t * (-0.356563782
                + t * (1.781477937
                + t * (-1.821255978
                + t * 1.330274429))));
        double pdf  = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        double cdf  = 1.0 - pdf * poly;
        return x >= 0 ? cdf : 1.0 - cdf;
    }

    private BigDecimal bd(double val) {
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP);
    }
}
