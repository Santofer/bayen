-- C17 — Marqueur de passage de la détection halal par vision.
--
-- Le cron de nommage ne cible que les produits sans nom : sans marqueur
-- dédié, la détection du logo halal n'aurait jamais atteint les 2500 produits
-- déjà nommés. Cette colonne permet une cible séparée et idempotente.

BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS halal_checked_at TIMESTAMPTZ;

INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('products', 'halal_checked_at', NULL, 'datetime', 'datetime', true, true, false, 29, 'half', 'Date du dernier passage de la détection halal par vision.')
ON CONFLICT DO NOTHING;

COMMIT;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'halal_checked_at';
