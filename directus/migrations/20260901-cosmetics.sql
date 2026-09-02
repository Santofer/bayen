-- C23 — Univers beauté : cosmétiques, INCI, perturbateurs endocriniens.
--
-- Un seul site, deux univers : `product_type` sur products (scanner, prix, halal,
-- contributions et points restent communs), un référentiel INCI dédié avec ses
-- classes de risque sourcées, et une jonction produit ↔ ingrédient cosmétique.
-- Le score cosmétique s'écrit dans scan_score / score_label (uniformité des
-- cartes et du classement) mais vient d'un algorithme séparé.

BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(12) NOT NULL DEFAULT 'food';
ALTER TABLE products ADD COLUMN IF NOT EXISTS inci_text TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS period_after_opening VARCHAR(8);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cosmetic_category VARCHAR(40);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cosmetic_risk JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inci_read_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS products_type_idx ON products (product_type, status);

CREATE TABLE IF NOT EXISTS cosmetic_ingredients (
  id             SERIAL PRIMARY KEY,
  inci_name      VARCHAR(200) NOT NULL UNIQUE,
  name_fr        VARCHAR(200),
  synonyms       JSONB,
  cas_number     VARCHAR(40),
  functions      JSONB,
  risk_level     VARCHAR(10) NOT NULL DEFAULT 'unknown',
  risk_types     JSONB,
  risk_status    VARCHAR(12),
  restriction_fr TEXT,
  source_label   VARCHAR(120),
  source_url     TEXT,
  note_fr        TEXT,
  status         VARCHAR(12) NOT NULL DEFAULT 'published'
);
CREATE INDEX IF NOT EXISTS cosmetic_ingredients_risk_idx ON cosmetic_ingredients (risk_level);

CREATE TABLE IF NOT EXISTS products_cosmetic_ingredients (
  id            SERIAL PRIMARY KEY,
  products_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES cosmetic_ingredients(id) ON DELETE CASCADE,
  rank          INTEGER,
  raw_text      VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS pci_product_idx ON products_cosmetic_ingredients (products_id);
CREATE INDEX IF NOT EXISTS pci_ingredient_idx ON products_cosmetic_ingredients (ingredient_id);

-- ── Déclarations Directus ─────────────────────────────────────────────
INSERT INTO directus_collections (collection, icon, note, hidden, singleton) VALUES
  ('cosmetic_ingredients',          'science', 'Référentiel INCI (CosIng + couche éditoriale sourcée) avec classes de risque.', false, false),
  ('products_cosmetic_ingredients', 'link',    'Jonction produit cosmétique ↔ ingrédient INCI (rang, texte brut).', true, false)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('products', 'product_type',         NULL,        'select-dropdown', 'labels',   false, false, false, 30, 'half', 'food | cosmetic — décidé par le scan (OFF/OBF) ou le wizard.'),
  ('products', 'inci_text',            NULL,        'input-multiline', 'raw',      false, false, false, 31, 'full', 'Liste INCI brute normalisée (cosmétiques).'),
  ('products', 'period_after_opening', NULL,        'input',           'raw',      false, false, false, 32, 'half', 'PAO, ex. 12M.'),
  ('products', 'cosmetic_category',    NULL,        'select-dropdown', 'labels',   false, false, false, 33, 'half', 'Catégorie beauté.'),
  ('products', 'cosmetic_risk',        'cast-json', 'input-code',      'raw',      false, true,  false, 34, 'full', 'Résumé du score cosmétique (calculé).'),
  ('products', 'inci_read_at',         NULL,        'datetime',        'datetime', true,  true,  false, 35, 'half', 'Dernière lecture vision de la liste INCI.'),

  ('cosmetic_ingredients', 'id',             NULL,        'input',           'raw',    true,  true,  false, 1,  'half', NULL),
  ('cosmetic_ingredients', 'inci_name',      NULL,        'input',           'raw',    false, false, true,  2,  'half', 'Nom INCI (majuscules).'),
  ('cosmetic_ingredients', 'name_fr',        NULL,        'input',           'raw',    false, false, false, 3,  'half', 'Nom courant en français.'),
  ('cosmetic_ingredients', 'synonyms',       'cast-json', 'tags',            'labels', false, false, false, 4,  'full', 'Variantes d''écriture.'),
  ('cosmetic_ingredients', 'cas_number',     NULL,        'input',           'raw',    false, false, false, 5,  'half', 'Numéro CAS.'),
  ('cosmetic_ingredients', 'functions',      'cast-json', 'tags',            'labels', false, false, false, 6,  'full', 'Fonctions CosIng.'),
  ('cosmetic_ingredients', 'risk_level',     NULL,        'select-dropdown', 'labels', false, false, true,  7,  'half', 'none | low | moderate | high | banned | unknown'),
  ('cosmetic_ingredients', 'risk_types',     'cast-json', 'tags',            'labels', false, false, false, 8,  'full', 'endocrine, allergen, irritant, cmr, environment, restricted'),
  ('cosmetic_ingredients', 'risk_status',    NULL,        'select-dropdown', 'labels', false, false, false, 9,  'half', 'suspected | confirmed'),
  ('cosmetic_ingredients', 'restriction_fr', NULL,        'input',           'raw',    false, false, false, 10, 'full', 'Condition réglementaire (ex. max 0,5 %).'),
  ('cosmetic_ingredients', 'source_label',   NULL,        'input',           'raw',    false, false, false, 11, 'half', 'Source (CosIng Annexe II, liste PE CE 2019…).'),
  ('cosmetic_ingredients', 'source_url',     NULL,        'input',           'raw',    false, false, false, 12, 'half', 'Lien vers la source.'),
  ('cosmetic_ingredients', 'note_fr',        NULL,        'input-multiline', 'raw',    false, false, false, 13, 'full', 'Explication grand public.'),
  ('cosmetic_ingredients', 'status',         NULL,        'select-dropdown', 'labels', false, false, false, 14, 'half', 'published | draft (inconnus créés automatiquement)'),

  ('products_cosmetic_ingredients', 'id',            NULL,  'input',               'raw',            true,  true,  false, 1, 'half', NULL),
  ('products_cosmetic_ingredients', 'products_id',   'm2o', 'select-dropdown-m2o', 'related-values', false, false, true,  2, 'half', NULL),
  ('products_cosmetic_ingredients', 'ingredient_id', 'm2o', 'select-dropdown-m2o', 'related-values', false, false, true,  3, 'half', NULL),
  ('products_cosmetic_ingredients', 'rank',          NULL,  'input',               'raw',            false, false, false, 4, 'half', NULL),
  ('products_cosmetic_ingredients', 'raw_text',      NULL,  'input',               'raw',            false, false, false, 5, 'half', 'Tel qu''imprimé sur l''emballage.')
ON CONFLICT DO NOTHING;

INSERT INTO directus_relations (many_collection, many_field, one_collection) VALUES
  ('products_cosmetic_ingredients', 'products_id',   'products'),
  ('products_cosmetic_ingredients', 'ingredient_id', 'cosmetic_ingredients')
ON CONFLICT DO NOTHING;

UPDATE directus_fields SET options = '{"choices":[
  {"text":"Alimentaire","value":"food","foreground":"#ffffff","background":"#476a32"},
  {"text":"Cosmétique","value":"cosmetic","foreground":"#ffffff","background":"#1f6f78"}
]}'::json WHERE collection = 'products' AND field = 'product_type';

UPDATE directus_fields SET options = '{"choices":[
  {"text":"Visage","value":"visage"},{"text":"Corps","value":"corps"},{"text":"Cheveux","value":"cheveux"},
  {"text":"Hygiène","value":"hygiene"},{"text":"Dents","value":"dents"},{"text":"Maquillage","value":"maquillage"},
  {"text":"Parfum","value":"parfum"},{"text":"Solaire","value":"solaire"},{"text":"Bébé","value":"bebe"},
  {"text":"Homme","value":"homme"},{"text":"Éclaircissant","value":"eclaircissant"},{"text":"Ongles","value":"ongles"}
]}'::json WHERE collection = 'products' AND field = 'cosmetic_category';

UPDATE directus_fields SET options = '{"choices":[
  {"text":"Aucun risque connu","value":"none","foreground":"#ffffff","background":"#476a32"},
  {"text":"Faible","value":"low","foreground":"#2a3f1e","background":"#b1cf3a"},
  {"text":"Modéré","value":"moderate","foreground":"#ffffff","background":"#f97316"},
  {"text":"Élevé","value":"high","foreground":"#ffffff","background":"#ef4444"},
  {"text":"Interdit","value":"banned","foreground":"#ffffff","background":"#7f1d1d"},
  {"text":"Non évalué","value":"unknown","foreground":"#ffffff","background":"#9ca3af"}
]}'::json WHERE collection = 'cosmetic_ingredients' AND field = 'risk_level';

UPDATE directus_fields SET options = '{"choices":[
  {"text":"Suspecté","value":"suspected","foreground":"#ffffff","background":"#f97316"},
  {"text":"Avéré","value":"confirmed","foreground":"#ffffff","background":"#ef4444"}
]}'::json WHERE collection = 'cosmetic_ingredients' AND field = 'risk_status';

-- ── Permissions ───────────────────────────────────────────────────────
-- Lecture publique du référentiel et de la jonction (fiches produit SSR)
INSERT INTO directus_permissions (policy, collection, action, fields, permissions, validation)
SELECT 'abf8a154-5b1c-4a46-ac9c-7300570f4f17'::uuid, 'cosmetic_ingredients', 'read', '*',
       '{"status":{"_eq":"published"}}'::json, '{}'::json
WHERE NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy='abf8a154-5b1c-4a46-ac9c-7300570f4f17'::uuid AND collection='cosmetic_ingredients' AND action='read');
INSERT INTO directus_permissions (policy, collection, action, fields, permissions, validation)
SELECT 'abf8a154-5b1c-4a46-ac9c-7300570f4f17'::uuid, 'products_cosmetic_ingredients', 'read', '*', '{}'::json, '{}'::json
WHERE NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy='abf8a154-5b1c-4a46-ac9c-7300570f4f17'::uuid AND collection='products_cosmetic_ingredients' AND action='read');

-- Le formulaire « Corriger / compléter » peut éditer les champs beauté (liste blanche)
UPDATE directus_permissions
SET fields = 'name_fr,name_ar,brand,quantity,category_id,ingredients_text,energy_kcal,fat_total,fat_saturated,carbs_total,sugars,fiber,proteins,salt,image_front,image_nutrition,image_ingredients,inci_text,period_after_opening,cosmetic_category'
WHERE policy = '8e5e4986-8489-455c-be61-03cae906395c' AND collection = 'products' AND action = 'update';

COMMIT;

SELECT table_name FROM information_schema.tables
WHERE table_name IN ('cosmetic_ingredients', 'products_cosmetic_ingredients') ORDER BY 1;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('product_type','inci_text','cosmetic_category','cosmetic_risk','period_after_opening','inci_read_at') ORDER BY 1;
