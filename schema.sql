-- Thunder POS — Supabase Schema
-- Run this in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wholesale_orders (
  id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  state JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Seed default app state
INSERT INTO app_state (id, state) VALUES (1, '{
  "settings": {
    "storeName": "Thunder Store",
    "storeAddress": "",
    "storePhone": "",
    "storeEmail": "",
    "currency": "MAD",
    "taxRate": 0,
    "receiptHeader": "Thank you for your purchase!",
    "receiptFooter": "No exchange without receipt.",
    "websiteUrl": "",
    "apiKey": "",
    "labelSize": "medium"
  },
  "categories": ["Shirts and Tops", "Sweatshirts and Zippers", "Pants", "Shorts", "Jackets", "Accessories"],
  "receiptCounter": 1,
  "currentCashSession": null
}') ON CONFLICT (id) DO NOTHING;

-- Disable RLS (open access via anon key)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;

-- Enable real-time sync on all tables
-- If you get "already exists" errors, these are already enabled — that's fine.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sales;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wholesale_orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE cash_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE app_state;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
