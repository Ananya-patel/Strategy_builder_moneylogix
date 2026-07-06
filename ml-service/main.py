from fastapi import FastAPI
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