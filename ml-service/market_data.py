# ml-service/market_data.py  (new file)
import numpy as np
import yfinance as yf
from functools import lru_cache
from datetime import datetime, timedelta

# NIFTY on Yahoo is "^NSEI"; use "SPY"/"AAPL" if you want live option chains too.
DEFAULT_SYMBOL_MAP = {"NIFTY": "^NSEI", "SPY": "SPY", "AAPL": "AAPL"}

class MarketDataProvider:
    def get_spot(self, symbol: str) -> float: raise NotImplementedError
    def get_hist_vol(self, symbol: str) -> float: raise NotImplementedError

class MockMarketDataProvider(MarketDataProvider):
    def get_spot(self, symbol): return 24800.0
    def get_hist_vol(self, symbol): return 0.15

class LiveMarketDataProvider(MarketDataProvider):
    @lru_cache(maxsize=32)
    def _download(self, yf_symbol: str):
        end = datetime.now()
        start = end - timedelta(days=90)
        return yf.download(yf_symbol, start=start, end=end, progress=False)

    def get_spot(self, symbol):
        df = self._download(DEFAULT_SYMBOL_MAP.get(symbol, symbol))
        return float(df["Close"].iloc[-1])

    def get_hist_vol(self, symbol):
        df = self._download(DEFAULT_SYMBOL_MAP.get(symbol, symbol))
        log_ret = np.log(df["Close"] / df["Close"].shift(1)).dropna()
        return float(log_ret.std() * np.sqrt(252))   # annualized realized vol

def get_provider(mode: str) -> MarketDataProvider:
    return LiveMarketDataProvider() if mode == "live" else MockMarketDataProvider()
