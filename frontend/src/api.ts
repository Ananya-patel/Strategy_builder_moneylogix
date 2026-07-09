const API_BASE = "http://localhost:8080/api";

export interface RiskAnswers {
  loss_tolerance: number;
  drawdown_reaction: number;
  investment_horizon: number;
  income_stability: number;
  prior_experience: number;
  goal: number;
}

export interface RiskProfileResponse {
  id: string;
  userId: string;
  riskBand: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  score: number;
  createdAt: string;
}

export interface Strategy {
  name: string;
  description: string;
  maxLoss: number | null;
  maxProfit: number | null;
}

export interface RecommendationResponse {
  userId: string;
  symbol: string;
  riskBand: string;
  recommendedStrategy: Strategy;
  confidence: number;
}

export async function saveRiskProfile(answers: RiskAnswers): Promise<RiskProfileResponse> {
  const res = await fetch(`${API_BASE}/risk-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error(`Failed to save risk profile: ${res.status}`);
  return res.json();
}

export async function getRecommendation(symbol: string = "NIFTY"): Promise<RecommendationResponse> {
  const res = await fetch(`${API_BASE}/strategy/recommend?symbol=${symbol}`);
  if (!res.ok) throw new Error(`Failed to get recommendation: ${res.status}`);
  return res.json();
}
// ---------------- Payoff / Greeks ----------------

export interface OptionLeg {
  option_type: "call" | "put";
  position: "buy" | "sell";
  strike: number;
  premium: number;
  quantity?: number;
}

export interface LegGreeks {
  strike: number;
  option_type: string;
  position: string;
  delta: number;
  theta: number;
}

export interface PayoffResponse {
  spot_prices: number[];
  payoff: number[];
  breakevens: number[];
  max_profit: number | string;
  max_loss: number | string;
  leg_greeks: LegGreeks[];
  net_delta: number;
  net_theta: number;
}

export async function getPayoff(
  legs: OptionLeg[],
  currentSpot: number
): Promise<PayoffResponse> {
  const res = await fetch(`${API_BASE}/strategy/payoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      legs,
      current_spot: currentSpot,
    }),
  });
  if (!res.ok) throw new Error(`Failed to get payoff: ${res.status}`);
  return res.json();
}

// ---------------- Save / Load Strategy ----------------

export interface SavedStrategyLeg {
  optionType: string;
  action: string;
  strikePrice: number;
  expiryDate: string;
  quantity: number;
  premium: number;
}

export interface SaveStrategyRequest {
  name: string;
  underlyingSymbol: string;
  legs: SavedStrategyLeg[];
}

export interface SaveStrategyResponse {
  strategyId: string;
  status: string;
}

export interface SavedStrategySummary {
  id: string;
  name: string;
  underlying_symbol: string;
  status: string;
  created_at: string;
}

export async function saveStrategy(req: SaveStrategyRequest): Promise<SaveStrategyResponse> {
  const res = await fetch(`${API_BASE}/strategy/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Failed to save strategy: ${res.status}`);
  return res.json();
}

export async function getMyStrategies(): Promise<SavedStrategySummary[]> {
  const res = await fetch(`${API_BASE}/strategy/my-strategies`);
  if (!res.ok) throw new Error(`Failed to load strategies: ${res.status}`);
  return res.json();
}
