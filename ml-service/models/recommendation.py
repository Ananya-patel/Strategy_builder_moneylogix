from pydantic import BaseModel
from typing import Literal, Optional
from enum import Enum

class RiskBand(str, Enum):
    CONSERVATIVE = "CONSERVATIVE"
    MODERATE = "MODERATE"
    AGGRESSIVE = "AGGRESSIVE"

class RecommendationRequest(BaseModel):
    userId: str
    riskBand: RiskBand
    symbol: str = "NIFTY"

class Strategy(BaseModel):
    name: str
    description: str
    maxLoss: Optional[float] = None
    maxProfit: Optional[float] = None

class RecommendationResponse(BaseModel):
    userId: str
    symbol: str
    riskBand: RiskBand
    recommendedStrategy: Strategy
    confidence: float