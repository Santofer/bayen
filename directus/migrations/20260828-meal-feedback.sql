-- C21 — Feedback des estimations repas + référentiel de plats marocains.
--
-- meal_feedback   : retour utilisateur (pouce + correction optionnelle) sur une
--                   estimation IA. Anonyme autorisé — aucune photo, aucun
--                   contenu personnel, uniquement le plat détecté et la
--                   correction saisie.
-- moroccan_dishes : référentiel de plats marocains (fourchettes de calories par
--                   portion typique). Injecté dans le prompt de /meal-analyze et
--                   utilisé pour recaler les estimations. Lecture publique.
--
-- `id` : DEFAULT en base ET fourni par le code (leçon ai_logs, cf. prices).

BEGIN;

CREATE TABLE IF NOT EXISTS meal_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_scan_id  UUID REFERENCES meal_scans(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  session_id    VARCHAR(64),
  plat_detecte  VARCHAR(255),
  rating        VARCHAR(8) NOT NULL CHECK (rating IN ('up', 'down')),
  correction    JSONB,
  confiance_ia  VARCHAR(10),
  date_created  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meal_feedback_plat_idx ON meal_feedback (plat_detecte, date_created DESC);

CREATE TABLE IF NOT EXISTS moroccan_dishes (
  id                SERIAL PRIMARY KEY,
  name_fr           VARCHAR(120) NOT NULL UNIQUE,
  name_ar           VARCHAR(120),
  aliases           JSONB,
  portion_typique_g INTEGER,
  kcal_min          INTEGER,
  kcal_max          INTEGER,
  proteines_g       NUMERIC(6,1),
  glucides_g        NUMERIC(6,1),
  lipides_g         NUMERIC(6,1),
  verdict_typique   VARCHAR(20),
  notes             TEXT,
  status            VARCHAR(12) NOT NULL DEFAULT 'published'
);

INSERT INTO directus_collections (collection, icon, note, hidden, singleton) VALUES
  ('meal_feedback',   'thumbs_up_down', 'Retours des utilisateurs sur les estimations IA de repas (pouce + correction).', false, false),
  ('moroccan_dishes', 'ramen_dining',   'Référentiel des plats marocains : fourchettes caloriques par portion typique, utilisé pour caler les estimations IA.', false, false)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('meal_feedback', 'id',           'uuid',         'input',               'raw',            true,  true,  false, 1, 'half', NULL),
  ('meal_feedback', 'meal_scan_id', 'm2o',          'select-dropdown-m2o', 'related-values', false, false, false, 2, 'half', 'Scan concerné (null si anonyme).'),
  ('meal_feedback', 'user_id',      'm2o',          'select-dropdown-m2o', 'related-values', false, false, false, 3, 'half', 'Auteur connecté (null si anonyme).'),
  ('meal_feedback', 'session_id',   NULL,           'input',               'raw',            true,  true,  false, 4, 'half', 'Session anonyme.'),
  ('meal_feedback', 'plat_detecte', NULL,           'input',               'raw',            false, false, false, 5, 'half', 'Plat identifié par l''IA.'),
  ('meal_feedback', 'rating',       NULL,           'select-dropdown',     'labels',         false, false, true,  6, 'half', 'Estimation jugée fiable ou non.'),
  ('meal_feedback', 'correction',   'cast-json',    'input-code',          'raw',            false, false, false, 7, 'full', 'Correction saisie : plat, portion_g, calories_kcal.'),
  ('meal_feedback', 'confiance_ia', NULL,           'input',               'raw',            false, false, false, 8, 'half', 'Confiance annoncée par l''IA.'),
  ('meal_feedback', 'date_created', 'date-created', 'datetime',            'datetime',       false, true,  false, 9, 'half', NULL),

  -- clé auto-incrémentée (SERIAL) : surtout PAS de special 'uuid', qui
  -- ferait générer un UUID par Directus pour une colonne integer.
  ('moroccan_dishes', 'id',                NULL,        'input',           'raw',    true,  true,  false, 1,  'half', NULL),
  ('moroccan_dishes', 'name_fr',           NULL,        'input',           'raw',    false, false, true,  2,  'half', 'Nom de référence (celui que l''IA doit employer).'),
  ('moroccan_dishes', 'name_ar',           NULL,        'input',           'raw',    false, false, false, 3,  'half', 'Nom en arabe.'),
  ('moroccan_dishes', 'aliases',           'cast-json', 'tags',            'labels', false, false, false, 4,  'full', 'Variantes d''écriture pour le matching.'),
  ('moroccan_dishes', 'portion_typique_g', NULL,        'input',           'raw',    false, false, false, 5,  'half', 'Portion de référence (g).'),
  ('moroccan_dishes', 'kcal_min',          NULL,        'input',           'raw',    false, false, false, 6,  'half', 'Calories basses pour la portion typique.'),
  ('moroccan_dishes', 'kcal_max',          NULL,        'input',           'raw',    false, false, false, 7,  'half', 'Calories hautes pour la portion typique.'),
  ('moroccan_dishes', 'proteines_g',       NULL,        'input',           'raw',    false, false, false, 8,  'half', 'Protéines pour la portion typique (g).'),
  ('moroccan_dishes', 'glucides_g',        NULL,        'input',           'raw',    false, false, false, 9,  'half', 'Glucides pour la portion typique (g).'),
  ('moroccan_dishes', 'lipides_g',         NULL,        'input',           'raw',    false, false, false, 10, 'half', 'Lipides pour la portion typique (g).'),
  ('moroccan_dishes', 'verdict_typique',   NULL,        'select-dropdown', 'labels', false, false, false, 11, 'half', 'Verdict habituel du plat.'),
  ('moroccan_dishes', 'notes',             NULL,        'input-multiline', 'raw',    false, false, false, 12, 'full', 'Précisions (variabilité, mode de préparation).'),
  ('moroccan_dishes', 'status',            NULL,        'select-dropdown', 'labels', false, false, false, 13, 'half', 'published | draft')
ON CONFLICT DO NOTHING;

UPDATE directus_fields
SET options = '{"choices":[
  {"text":"Fiable","value":"up","foreground":"#ffffff","background":"#476a32"},
  {"text":"Pas fiable","value":"down","foreground":"#ffffff","background":"#f97316"}
]}'::json
WHERE collection = 'meal_feedback' AND field = 'rating';

UPDATE directus_fields
SET options = '{"choices":[
  {"text":"Sain","value":"sain","foreground":"#ffffff","background":"#476a32"},
  {"text":"Équilibré","value":"equilibre","foreground":"#2a3f1e","background":"#b1cf3a"},
  {"text":"À limiter","value":"a_limiter","foreground":"#ffffff","background":"#f97316"},
  {"text":"Occasionnel","value":"occasionnel","foreground":"#ffffff","background":"#ef4444"}
]}'::json
WHERE collection = 'moroccan_dishes' AND field = 'verdict_typique';

-- Lecture publique du référentiel (app.py le charge sans token, le front peut
-- l'afficher). meal_feedback reste fermé : écriture par endpoint uniquement.
INSERT INTO directus_permissions (policy, collection, action, fields, permissions, validation)
SELECT
  'abf8a154-5b1c-4a46-ac9c-7300570f4f17'::uuid,
  'moroccan_dishes',
  'read',
  'id,name_fr,name_ar,aliases,portion_typique_g,kcal_min,kcal_max,proteines_g,glucides_g,lipides_g,verdict_typique,notes,status',
  '{"status":{"_eq":"published"}}'::json,
  '{}'::json
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE policy = 'abf8a154-5b1c-4a46-ac9c-7300570f4f17'::uuid
    AND collection = 'moroccan_dishes'
    AND action = 'read'
);

COMMIT;

SELECT table_name FROM information_schema.tables
WHERE table_name IN ('meal_feedback', 'moroccan_dishes') ORDER BY table_name;
