CREATE TABLE strategy (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id),
    recommendation_id UUID REFERENCES recommendation(id),
    name VARCHAR(255),
    underlying_symbol VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SAVED','SENT_TO_PAPER_TRADING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE strategy_leg (
    id UUID PRIMARY KEY,
    strategy_id UUID NOT NULL REFERENCES strategy(id) ON DELETE CASCADE,
    option_type VARCHAR(4) NOT NULL CHECK (option_type IN ('CALL','PUT')),
    action VARCHAR(4) NOT NULL CHECK (action IN ('BUY','SELL')),
    strike_price NUMERIC(12,2) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    premium NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_strategy_user_id ON strategy(user_id);
CREATE INDEX idx_strategy_leg_strategy_id ON strategy_leg(strategy_id);