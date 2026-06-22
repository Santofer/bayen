-- meal_scans v2 : schéma estimation calories/macros (Qwen3.5-9B vision)
-- Table vide → ajout de colonnes sans migration de données.

BEGIN;

ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS calories_min INT;
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS calories_max INT;
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS portion_g INT;
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS proteines_g INT;
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS glucides_g INT;
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS lipides_g INT;
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS confiance VARCHAR(10);
ALTER TABLE meal_scans ADD COLUMN IF NOT EXISTS remarques TEXT;

-- Fields Directus pour les nouvelles colonnes (interface admin)
INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('meal_scans', 'calories_min', NULL, 'input', 'raw', false, false, false, 20, 'half', 'Borne basse calories estimées.'),
  ('meal_scans', 'calories_max', NULL, 'input', 'raw', false, false, false, 21, 'half', 'Borne haute calories estimées.'),
  ('meal_scans', 'portion_g',    NULL, 'input', 'raw', false, false, false, 22, 'half', 'Portion visible estimée (g).'),
  ('meal_scans', 'proteines_g',  NULL, 'input', 'raw', false, false, false, 23, 'half', 'Protéines estimées (g).'),
  ('meal_scans', 'glucides_g',   NULL, 'input', 'raw', false, false, false, 24, 'half', 'Glucides estimés (g).'),
  ('meal_scans', 'lipides_g',    NULL, 'input', 'raw', false, false, false, 25, 'half', 'Lipides estimés (g).'),
  ('meal_scans', 'confiance',    NULL, 'select-dropdown', 'labels', false, false, false, 26, 'half', 'Fiabilité de l''estimation.'),
  ('meal_scans', 'remarques',    NULL, 'input-multiline', 'raw', false, false, false, 27, 'full', 'Note du modèle.')
ON CONFLICT DO NOTHING;

UPDATE directus_fields
SET options = '{"choices":[
  {"text":"Faible","value":"faible","foreground":"#ffffff","background":"#f59e0b"},
  {"text":"Moyenne","value":"moyenne","foreground":"#ffffff","background":"#3b82f6"},
  {"text":"Élevée","value":"elevee","foreground":"#ffffff","background":"#16a34a"}
]}'::json
WHERE collection = 'meal_scans' AND field = 'confiance';

COMMIT;

SELECT column_name FROM information_schema.columns WHERE table_name='meal_scans' AND column_name IN ('calories_min','calories_max','portion_g','proteines_g','glucides_g','lipides_g','confiance','remarques') ORDER BY column_name;
