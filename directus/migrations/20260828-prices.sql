-- C22 — Prix communautaires.
--
-- Une ligne par prix observé. Anonyme autorisé (session_id) ou attribué
-- (user_id) — les hooks créditent alors des points. Aucune lecture publique
-- directe : l'agrégat passe par GET /bayen-api/prices/:barcode (les lignes
-- contiennent session_id / user_id).
--
-- `id` a un DEFAULT en base ET est fourni par le code : l'INSERT ne peut pas
-- échouer silencieusement comme ce fut le cas pour ai_logs.

BEGIN;

CREATE TABLE IF NOT EXISTS prices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_mad    NUMERIC(8,2) NOT NULL CHECK (price_mad BETWEEN 0.5 AND 10000),
  store        VARCHAR(60) NOT NULL,
  city         VARCHAR(60),
  user_id      UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  session_id   VARCHAR(64),
  status       VARCHAR(12) NOT NULL DEFAULT 'published',
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prices_product_date_idx ON prices (product_id, date_created DESC);

INSERT INTO directus_collections (collection, icon, note, hidden, singleton)
  VALUES ('prices', 'sell', 'Prix observés en magasin, partagés par la communauté. Agrégés par médiane sur la fiche produit.', false, false)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('prices', 'id',           'uuid',         'input',               'raw',            true,  true,  false, 1, 'half', NULL),
  ('prices', 'product_id',   'm2o',          'select-dropdown-m2o', 'related-values', false, false, true,  2, 'half', 'Produit concerné.'),
  ('prices', 'price_mad',    NULL,           'input',               'raw',            false, false, true,  3, 'half', 'Prix payé en dirhams.'),
  ('prices', 'store',        NULL,           'input',               'raw',            false, false, true,  4, 'half', 'Enseigne (normalisée côté endpoint).'),
  ('prices', 'city',         NULL,           'input',               'raw',            false, false, false, 5, 'half', 'Ville.'),
  ('prices', 'user_id',      'm2o',          'select-dropdown-m2o', 'related-values', false, false, false, 6, 'half', 'Contributeur connecté (null si anonyme).'),
  ('prices', 'session_id',   NULL,           'input',               'raw',            true,  true,  false, 7, 'half', 'Session anonyme (anti-doublon).'),
  ('prices', 'status',       NULL,           'select-dropdown',     'labels',         false, false, false, 8, 'half', 'published | flagged'),
  ('prices', 'date_created', 'date-created', 'datetime',            'datetime',       false, true,  false, 9, 'half', NULL)
ON CONFLICT DO NOTHING;

UPDATE directus_fields
SET options = '{"choices":[
  {"text":"Publié","value":"published","foreground":"#ffffff","background":"#476a32"},
  {"text":"Signalé","value":"flagged","foreground":"#ffffff","background":"#ef4444"}
]}'::json
WHERE collection = 'prices' AND field = 'status';

COMMIT;

SELECT table_name FROM information_schema.tables WHERE table_name = 'prices';
