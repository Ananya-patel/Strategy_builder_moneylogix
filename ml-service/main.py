import asyncio
import random
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from models.recommendation import (
    RecommendationRequest, RecommendationResponse, Strategy, RiskBand
)

app = FastAPI(title="Strategy Builder ML Service")

STRATEGY_MAP = {
    RiskBand.CONSERVATIVE: Strategy(
        name="Covered Call",
        description="Hold underlying + sell OTM call for income, capped upside.",
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