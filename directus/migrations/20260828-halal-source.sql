-- C17 — Statut halal sourcé.
--
-- `products.is_halal` existait déjà (importé depuis OFF `labels_tags`) mais
-- sans provenance ni possibilité pour la communauté de le confirmer : un
-- badge affiché sans qu'on sache d'où vient l'information.
--
-- halal_source        : 'off' | 'packaging_user' | 'vision'
-- halal_confirmations : nombre de personnes ayant vu le logo sur l'emballage

BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS halal_source VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS halal_confirmations INTEGER NOT NULL DEFAULT 0;

-- Backfill : tout ce qui est déjà halal vient de l'import Open Food Facts.
UPDATE products SET halal_source = 'off' WHERE is_halal = TRUE AND halal_source IS NULL;

INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('products', 'halal_source',        NULL, 'select-dropdown', 'labels', false, false, false, 27, 'half', 'Provenance de l''information halal.'),
  ('products', 'halal_confirmations', NULL, 'input',           'raw',    false, true,  false, 28, 'half', 'Nombre de confirmations communautaires (logo vu sur l''emballage).')
ON CONFLICT DO NOTHING;

UPDATE directus_fields
SET options = '{"choices":[
  {"text":"Open Food Facts","value":"off","foreground":"#ffffff","background":"#3b82f6"},
  {"text":"Emballage (communauté)","value":"packaging_user","foreground":"#ffffff","background":"#476a32"},
  {"text":"Vision IA","value":"vision","foreground":"#2a3f1e","background":"#b1cf3a"}
]}'::json
WHERE collection = 'products' AND field = 'halal_source';

COMMIT;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('halal_source', 'halal_confirmations')
ORDER BY column_name;
