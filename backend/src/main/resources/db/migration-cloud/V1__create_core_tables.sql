CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risk_profile (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id),
    risk_band VARCHAR(20) NOT NULL CHECK (risk_band IN ('CONSERVATIVE','MODERATE','AGGRESSIVE')),
    score INTEGER NOT NULL,
    answers JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_profile_user_id ON risk_profile(user_id);

INSERT INTO app_user (id, email, display_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'demo@strategybuilder.local', 'Demo User');