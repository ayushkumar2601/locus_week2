-- Credit purchase history table for user payments and admin analytics
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount_usd NUMERIC(10,2) NOT NULL CHECK (amount_usd > 0),
  payment_method TEXT,
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user
  ON credit_purchases(user_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_status
  ON credit_purchases(status, purchased_at DESC);
