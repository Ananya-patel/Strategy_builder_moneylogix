import asyncio
import math
import random
from datetime import date, datetime
import numpy as np
from scipy.stats import norm
from pydantic import BaseModel
from typing import List, Optional
from market_data import get_provider


from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from models.recommendation import (
    RecommendationRequest, RecommendationResponse, Strategy, RiskBand
)

app = FastAPI(title="Strategy Builder ML Service")

STRATEGY_MAP = {
    RiskBand.CONSERVATIVE: Strategy(
        name="Covered Call",
        description="Hold underlying + sell OTM call for income,capped upside.",
        maxLoss=None,
        maxProfit=None,
    ),
    RiskBand.MODERATE: Strategy(
        name="Iron Condor",
        description="Sell OTM call+put spreads; profits in a defined range.",
        maxLoss=None,
        maxProfit=None,
    ),
    RiskBand.AGGRESSIVE: Strategy(
        name="Long Straddle",
        description="Buy ATM call+put; profits from large moves either direction.",
        maxLoss=None,
        maxProfit=None,
    ),
}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/recommend", response_model=RecommendationResponse)
def recommend(req: RecommendationRequest):
    strategy = STRATEGY_MAP[req.riskBand]
    return RecommendationResponse(
        userId=req.userId,
        symbol=req.symbol,
        riskBand=req.riskBand,
        recommendedStrategy=strategy,
        confidence=0.75,
    )


def generate_option_chain(symbol: str, spot: float):
    strikes = [round(spot + i * 50, 0) for i in range(-5, 6)]
    chain = []
    for strike in strikes:
        distance = abs(strike - spot)
        base_iv = 15 + (distance / spot) * 40

        call_ltp = max(spot - strike, 0) + random.uniform(5, 40)
        put_ltp = max(strike - spot, 0) + random.uniform(5, 40)

        chain.append({
            "strike": strike,
            "call": {
                "ltp": round(call_ltp, 2),
                "iv": round(base_iv + random.uniform(-1, 1), 2),
                "oi": random.randint(1000, 50000),
                "volume": random.randint(100, 5000),
            },
            "put": {
                "ltp": round(put_ltp, 2),
                "iv": round(base_iv + random.uniform(-1, 1), 2),
                "oi": random.randint(1000, 50000),
                "volume": random.randint(100, 5000),
            },
        })
    return chain


@app.websocket("/ws/options-chain/{symbol}")
async def options_chain_ws(websocket: WebSocket, symbol: str):
    await websocket.accept()
    spot = 24800.0 if symbol.upper() == "NIFTY" else 51500.0

    try:
        while True:
            spot += random.uniform(-15, 15)

            payload = {
                "symbol": symbol.upper(),
                "spot": round(spot, 2),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "chain": generate_option_chain(symbol.upper(), spot),
            }
            await websocket.send_json(payload)
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        print(f"Client disconnected from {symbol} feed")


# ---------------- Step 7: Payoff Diagram ----------------

class OptionLeg(BaseModel):
    option_type: str   # "call" or "put"
    position: str       # "buy" or "sell"
    strike: float
    premium: float
    quantity: int = 1
    iv: Optional[float] = None           # None => filled from market vol
    days_to_expiry: Optional[int] = 7    # default 1 week out

class PayoffRequest(BaseModel):
    legs: List[OptionLeg]
    spot_range_pct: float = 0.1  # +/-10% around current spot
    current_spot: float
    steps: int = 100
    symbol: Optional[str] = "NIFTY"   # used to pull market vol
    provider: str = "mock"            # "mock" or "live"


def leg_payoff(leg: OptionLeg, spot_prices: np.ndarray) -> np.ndarray:
    if leg.option_type == "call":
        intrinsic = np.maximum(spot_prices - leg.strike, 0)
    else:  # put
        intrinsic = np.maximum(leg.strike - spot_prices, 0)

    if leg.position == "buy":
        payoff = (intrinsic - leg.premium) * leg.quantity
    else:  # sell
        payoff = (leg.premium - intrinsic) * leg.quantity

    return payoff


def calculate_greeks(spot: float, strike: float, option_type: str,
                      days_to_expiry: int = 7, iv: float = 0.15, r: float = 0.06):
    """Black-Scholes delta and theta for a single leg."""
    T = max(days_to_expiry, 1) / 365
    sigma = max(iv, 0.01)

    d1 = (math.log(spot / strike) + (r + sigma**2 / 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    if option_type == "call":
        delta = norm.cdf(d1)
        theta = (
            -(spot * norm.pdf(d1) * sigma) / (2 * math.sqrt(T))
            - r * strike * math.exp(-r * T) * norm.cdf(d2)
        ) / 365
    else:  # put
        delta = norm.cdf(d1) - 1
        theta = (
            -(spot * norm.pdf(d1) * sigma) / (2 * math.sqrt(T))
            + r * strike * math.exp(-r * T) * norm.cdf(-d2)
        ) / 365

    return {"delta": round(float(delta), 4), "theta": round(float(theta), 4)}


def leg_greeks_signed(leg: OptionLeg, spot: float):
    """Greeks for a leg, sign-adjusted for buy (+1) vs sell (-1) and quantity."""
    iv = leg.iv if leg.iv is not None else 0.15
    raw = calculate_greeks(spot, leg.strike, leg.option_type, leg.days_to_expiry, iv)
    direction = 1 if leg.position == "buy" else -1
    return {
        "delta": round(raw["delta"] * direction * leg.quantity, 4),
        "theta": round(raw["theta"] * direction * leg.quantity, 4),
    }


@app.post("/api/payoff")
def calculate_payoff(req: PayoffRequest):
    # Pull market-derived volatility; fall back safely if the live API fails.
    md = get_provider(req.provider)
    try:
        market_iv = md.get_hist_vol(req.symbol or "NIFTY")
    except Exception:
        market_iv = 0.15

    # Any leg without an explicit IV inherits the market volatility.
    for leg in req.legs:
        if leg.iv is None:
            leg.iv = market_iv

    low = req.current_spot * (1 - req.spot_range_pct)
    high = req.current_spot * (1 + req.spot_range_pct)
    spot_prices = np.linspace(low, high, req.steps)

    total_payoff = np.zeros(req.steps)
    for leg in req.legs:
        total_payoff += leg_payoff(leg, spot_prices)

    # breakeven points: where payoff crosses zero
    breakevens = []
    for i in range(len(total_payoff) - 1):
        if total_payoff[i] == 0:
            breakevens.append(round(float(spot_prices[i]), 2))
        elif total_payoff[i] * total_payoff[i + 1] < 0:  # sign change
            x0, x1 = spot_prices[i], spot_prices[i + 1]
            y0, y1 = total_payoff[i], total_payoff[i + 1]
            zero_x = x0 - y0 * (x1 - x0) / (y1 - y0)
            breakevens.append(round(float(zero_x), 2))

    max_profit = float(np.max(total_payoff))
    max_loss = float(np.min(total_payoff))

    # Greeks: per-leg (signed for buy/sell + quantity) and net totals
    leg_greeks = []
    net_delta = 0.0
    net_theta = 0.0
    for leg in req.legs:
        g = leg_greeks_signed(leg, req.current_spot)
        leg_greeks.append({
            "strike": leg.strike,
            "option_type": leg.option_type,
            "position": leg.position,
            "delta": g["delta"],
            "theta": g["theta"],
        })
        net_delta += g["delta"]
        net_theta += g["theta"]

    return {
        "spot_prices": [round(float(s), 2) for s in spot_prices],
        "payoff": [round(float(p), 2) for p in total_payoff],
        "breakevens": breakevens,
        "max_profit": max_profit if max_profit < 1e6 else "unlimited",
        "max_loss": max_loss if max_loss > -1e6 else "unlimited",
        "leg_greeks": leg_greeks,
        "net_delta": round(net_delta, 4),
        "net_theta": round(net_theta, 4),
        "market_iv": round(market_iv, 4),
        "data_source": req.provider,
    }

# ---------------- Step 8: Margin Estimator ----------------

class MarginRequest(BaseModel):
    legs: List[OptionLeg]
    current_spot: float


@app.post("/api/margin")
def calculate_margin(req: MarginRequest):
    spot_range_pct = 0.5
    steps = 200
    low = req.current_spot * (1 - spot_range_pct)
    high = req.current_spot * (1 + spot_range_pct)
    spot_prices = np.linspace(low, high, steps)

    total_payoff = np.zeros(steps)
    for leg in req.legs:
        total_payoff += leg_payoff(leg, spot_prices)

    max_loss = float(np.min(total_payoff))

    slope_low = total_payoff[1] - total_payoff[0]
    slope_high = total_payoff[-1] - total_payoff[-2]
    is_defined_risk = not (slope_low > 0 or slope_high < 0)

    if is_defined_risk:
        margin_required = abs(max_loss)
        method = "max_loss"
    else:
        margin_required = 0.0
        for leg in req.legs:
            if leg.position == "sell":
                span = 0.15 * req.current_spot * leg.quantity
                exposure = 0.03 * req.current_spot * leg.quantity
                leg_margin = span + exposure - (leg.premium * leg.quantity)
                floor = 0.05 * req.current_spot * leg.quantity
                margin_required += max(leg_margin, floor)
        method = "span_approx"

    return {
        "margin_required": round(margin_required, 2),
        "method": method,
        "is_defined_risk": is_defined_risk,
        "max_loss": max_loss if is_defined_risk else "unlimited",
    }


@app.get("/api/market/{symbol}")
def market(symbol: str, provider: str = "mock"):
    md = get_provider(provider)
    return {"symbol": symbol, "spot": md.get_spot(symbol),
            "hist_vol": md.get_hist_vol(symbol), "source": provider}
