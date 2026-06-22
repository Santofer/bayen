-- meal_scans v3 : verdict qualitatif + conseil + alternatives
-- (remplace le score Nutri-Score 0-100, inadapté aux repas complets).

BEGIN;

ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS verdict VARCHAR(20);
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS caracteristiques JSONB;
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS conseil TEXT;
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS alternatives JSONB;

INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('meal_scans', 'verdict',          NULL,        'select-dropdown', 'labels', false, false, false, 30, 'half', 'Verdict qualitatif du repas.'),
  ('meal_scans', 'caracteristiques', 'cast-json', 'tags',            'labels', false, false, false, 31, 'full', 'Tags (gras, calorique, riche en légumes…).'),
  ('meal_scans', 'conseil',          NULL,        'input-multiline', 'raw',    false, false, false, 32, 'full', 'Conseil pratique.'),
  ('meal_scans', 'alternatives',     'cast-json', 'tags',            'labels', false, false, false, 33, 'full', 'Alternatives plus saines.')
ON CONFLICT DO NOTHING;

UPDATE directus_fields
SET options = '{"choices":[
  {"text":"Sain","value":"sain","foreground":"#ffffff","background":"#476a32"},
  {"text":"Équilibré","value":"equilibre","foreground":"#2a3f1e","background":"#b1cf3a"},
  {"text":"À limiter","value":"a_limiter","foreground":"#ffffff","background":"#f97316"},
  {"text":"Occasionnel","value":"occasionnel","foreground":"#ffffff","background":"#ef4444"}
]}'::json
WHERE collection = 'meal_scans' AND field = 'verdict';

COMMIT;

SELECT column_name FROM information_schema.columns WHERE table_name='meal_scans' AND column_name IN ('verdict','caracteristiques','conseil','alternatives') ORDER BY column_name;
