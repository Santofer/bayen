-- Table meal_scans : journal personnel des analyses photo de repas.
-- Stockée uniquement pour les utilisateurs connectés (user_id NOT NULL).
-- Les scans anonymes restent éphémères (pas de row en DB).

BEGIN;

CREATE TABLE IF NOT EXISTS meal_scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES directus_users(id) ON DELETE CASCADE,
  image           UUID REFERENCES directus_files(id) ON DELETE SET NULL,
  plat            VARCHAR(200),
  description     TEXT,
  ingredients     JSONB,                -- array de strings
  nutrition       JSONB,                -- nutrition_per_100g
  estimated_kcal  INT,
  estimated_portion VARCHAR(50),
  nova_group      SMALLINT,
  is_beverage     BOOLEAN DEFAULT FALSE,
  confidence      NUMERIC(3,2),         -- confiance du VLM 0.00-1.00
  meal_score      INT,                  -- score Bayen 0-100
  score_label     VARCHAR(20),          -- excellent | bon | médiocre | mauvais
  raw_analysis    JSONB,                -- réponse VLM complète pour audit
  date_created    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meal_scans_user_date_idx
  ON meal_scans (user_id, date_created DESC);

-- Enregistrement côté Directus
INSERT INTO directus_collections (collection, icon, note, hidden, singleton)
  VALUES (
    'meal_scans',
    'restaurant',
    'Journal personnel des analyses photo de plats. Une ligne par scan utilisateur connecté (les anonymes ne sont pas stockés).',
    false,
    false
  )
ON CONFLICT (collection) DO NOTHING;

-- Fields pour l'interface Directus
INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('meal_scans', 'id',              'uuid',         'input',              'raw',         true,  true,  false, 1,  'half',  NULL),
  ('meal_scans', 'user_id',         'm2o',          'select-dropdown-m2o','related-values',false, false, false, 2,  'half',  'Utilisateur connecté au moment du scan.'),
  ('meal_scans', 'image',           'file',         'file-image',         'image',       false, false, false, 3,  'full',  'Photo originale envoyée par l''utilisateur.'),
  ('meal_scans', 'plat',            NULL,           'input',              'raw',         false, false, false, 4,  'half',  'Nom identifié par le VLM.'),
  ('meal_scans', 'meal_score',      NULL,           'input',              'raw',         false, false, false, 5,  'half',  'Score Bayen 0-100.'),
  ('meal_scans', 'score_label',     NULL,           'select-dropdown',    'labels',      false, false, false, 6,  'half',  NULL),
  ('meal_scans', 'estimated_kcal',  NULL,           'input',              'raw',         false, false, false, 7,  'half',  'Calories estimées pour la portion visible.'),
  ('meal_scans', 'description',     NULL,           'input-multiline',    'raw',         false, false, false, 8,  'full',  NULL),
  ('meal_scans', 'ingredients',     'cast-json',    'tags',               'labels',      false, false, false, 9,  'full',  'Ingrédients détectés.'),
  ('meal_scans', 'nutrition',       'cast-json',    'input-code',         'raw',         false, false, false, 10, 'full',  'Nutrition estimée pour 100g.'),
  ('meal_scans', 'estimated_portion',NULL,          'input',              'raw',         false, false, false, 11, 'half',  NULL),
  ('meal_scans', 'nova_group',      NULL,           'input',              'raw',         false, false, false, 12, 'half',  NULL),
  ('meal_scans', 'is_beverage',     'cast-boolean', 'boolean',            'boolean',     false, false, false, 13, 'half',  NULL),
  ('meal_scans', 'confidence',      NULL,           'input',              'raw',         false, false, false, 14, 'half',  'Confiance du VLM (0-1).'),
  ('meal_scans', 'raw_analysis',    'cast-json',    'input-code',         'raw',         true,  true,  false, 15, 'full',  'Réponse VLM complète (debug).'),
  ('meal_scans', 'date_created',    'date-created', 'datetime',           'datetime',    false, true,  false, 16, 'half',  NULL)
ON CONFLICT DO NOTHING;

-- Options dropdown pour score_label (cohérent avec products)
UPDATE directus_fields
SET options = '{"choices":[
  {"text":"Excellent","value":"excellent","foreground":"#ffffff","background":"#476a32"},
  {"text":"Bon","value":"bon","foreground":"#2a3f1e","background":"#b1cf3a"},
  {"text":"Médiocre","value":"médiocre","foreground":"#ffffff","background":"#f97316"},
  {"text":"Mauvais","value":"mauvais","foreground":"#ffffff","background":"#ef4444"}
]}'::json
WHERE collection = 'meal_scans' AND field = 'score_label';

COMMIT;

SELECT collection, hidden, icon FROM directus_collections WHERE collection = 'meal_scans';
SELECT field, interface FROM directus_fields WHERE collection = 'meal_scans' ORDER BY sort;
