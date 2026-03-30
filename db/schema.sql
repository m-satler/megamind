CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    last_login    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    annual_income      NUMERIC,
    credit_score       INTEGER,
    experience_level   VARCHAR(50),
    risk_tolerance     VARCHAR(50),
    investment_horizon VARCHAR(50),
    existing_holdings  JSONB
);

CREATE TABLE IF NOT EXISTS accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    balance    NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW()
);