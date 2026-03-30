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

CREATE TABLE IF NOT EXISTS watchlist (
    watchlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticker       VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    added_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS portfolio (
    portfolio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_items (
    item_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id   UUID NOT NULL REFERENCES portfolio(portfolio_id) ON DELETE CASCADE,
    ticker         VARCHAR(20) NOT NULL,
    company_name   VARCHAR(255),
    shares_held    NUMERIC(15,4) NOT NULL DEFAULT 0,
    purchase_price NUMERIC(15,2) NOT NULL,
    purchased_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(portfolio_id, ticker)
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticker          VARCHAR(20) NOT NULL,
    type            VARCHAR(4) NOT NULL CHECK (type IN ('BUY', 'SELL')),
    shares          NUMERIC(15,4) NOT NULL,
    price_per_share NUMERIC(15,2) NOT NULL,
    total_amount    NUMERIC(15,2) NOT NULL,
    executed_at     TIMESTAMP DEFAULT NOW()
);