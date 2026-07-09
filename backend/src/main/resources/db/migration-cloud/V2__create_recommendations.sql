CREATE TABLE recommendation (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id),
    underlying_symbol VARCHAR(50) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    risk_band VARCHAR(20) NOT NULL,
    rank INTEGER NOT NULL,
    rationale TEXT NOT NULL,
    rule_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendation_user_id ON recommendation(user_id);