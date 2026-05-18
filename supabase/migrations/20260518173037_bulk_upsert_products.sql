-- Upsert massif de produits en une seule requête.
--
-- Pourquoi : sur le plan free Supabase, enchaîner 23 upserts HTTP (batches de
-- 500 lignes pour ~11k produits) tombait sur du rate limit / dégradation —
-- la 10ème requête restait en pending indéfiniment. Une RPC unique évite
-- complètement ce problème : un seul aller-retour, un seul lock pris.
--
-- Le payload arrive en JSONB. Les champs sont extraits avec p->>'k' (texte)
-- puis castés, en passant par NULLIF('','') pour les colonnes optionnelles
-- afin de ne pas planter sur une chaîne vide cast en INTEGER/NUMERIC/TIMESTAMPTZ.
CREATE OR REPLACE FUNCTION bulk_upsert_products(products_data JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO products (
    id, sku, name, ean, location_code, pareto, rank, rotation,
    stock, weight, last_picking, active, x, y
  )
  SELECT
    (p->>'id')::TEXT,
    (p->>'sku')::TEXT,
    (p->>'name')::TEXT,
    (p->>'ean')::TEXT,
    (p->>'location_code')::TEXT,
    (p->>'pareto')::TEXT,
    NULLIF(p->>'rank', '')::INTEGER,
    COALESCE(NULLIF(p->>'rotation', '')::NUMERIC, 0),
    COALESCE(NULLIF(p->>'stock', '')::INTEGER, 0),
    NULLIF(p->>'weight', '')::NUMERIC,
    NULLIF(p->>'last_picking', '')::TIMESTAMPTZ,
    COALESCE((p->>'active')::BOOLEAN, TRUE),
    NULLIF(p->>'x', '')::INTEGER,
    NULLIF(p->>'y', '')::INTEGER
  FROM jsonb_array_elements(products_data) AS p
  ON CONFLICT (id) DO UPDATE SET
    sku = EXCLUDED.sku,
    name = EXCLUDED.name,
    ean = EXCLUDED.ean,
    location_code = EXCLUDED.location_code,
    pareto = EXCLUDED.pareto,
    rank = EXCLUDED.rank,
    rotation = EXCLUDED.rotation,
    stock = EXCLUDED.stock,
    weight = EXCLUDED.weight,
    last_picking = EXCLUDED.last_picking,
    active = EXCLUDED.active,
    x = EXCLUDED.x,
    y = EXCLUDED.y,
    updated_at = NOW();
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;
