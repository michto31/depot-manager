-- Schéma initial Dépôt Manager
-- Trois tables : produits, plan du dépôt, statistiques quotidiennes.

-- Table des produits
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL, name TEXT NOT NULL,
  ean TEXT, location_code TEXT, pareto TEXT,
  rank INTEGER, rotation NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0, weight NUMERIC,
  last_picking TIMESTAMPTZ, active BOOLEAN DEFAULT TRUE,
  x INTEGER, y INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_location_code ON products(location_code);
CREATE INDEX idx_products_pareto ON products(pareto);
CREATE INDEX idx_products_active ON products(active);

CREATE TABLE warehouse_layout (
  id TEXT PRIMARY KEY DEFAULT 'main',
  width INTEGER NOT NULL, height INTEGER NOT NULL,
  cells JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_stats (
  date DATE PRIMARY KEY,
  picked INTEGER DEFAULT 0, packed INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0, errors INTEGER DEFAULT 0,
  hours NUMERIC DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_products_upd BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_layout_upd BEFORE UPDATE ON warehouse_layout FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_stats_upd BEFORE UPDATE ON daily_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
