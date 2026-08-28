-- C20 — Crédit de points idempotent.
--
-- Deux chemins créditent une contribution : sa création déjà approuvée
-- (formulaire) et son approbation ultérieure (admin). Sans marqueur, ré-enregistrer
-- une contribution déjà approuvée dans l'admin Directus recréditerait les points.
--
-- `points_awarded` est posé au moment du crédit et vérifié avant chaque crédit.

BEGIN;

ALTER TABLE contributions ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('contributions', 'points_awarded', 'cast-boolean', 'boolean', 'boolean', false, true, false, 10, 'half', 'Points déjà crédités pour cette contribution.')
ON CONFLICT DO NOTHING;

COMMIT;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'contributions' AND column_name = 'points_awarded';
