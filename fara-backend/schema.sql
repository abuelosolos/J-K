CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,
  password_hash TEXT,
  role          TEXT NOT NULL CHECK (role IN ('freelancer', 'client')),
  firebase_uid  TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id     INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn NUMERIC(15, 2) DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id            SERIAL PRIMARY KEY,
  freelancer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  amount_usd    NUMERIC(10, 2) NOT NULL,
  token         TEXT UNIQUE NOT NULL,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount_ngn  NUMERIC(15, 2) NOT NULL,
  description TEXT,
  reference   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_change_codes (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  new_password_hash TEXT NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
