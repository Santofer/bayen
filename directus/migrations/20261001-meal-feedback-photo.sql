-- Jeu d'entraînement repas : photo jointe (avec accord explicite) à une correction
ALTER TABLE meal_feedback ADD COLUMN IF NOT EXISTS photo uuid REFERENCES directus_files(id) ON DELETE SET NULL;
INSERT INTO directus_fields (collection, field, special, interface, display, readonly, hidden, required, sort, width, note)
SELECT 'meal_feedback', 'photo', 'file', 'file-image', 'image', true, false, false, 20, 'half',
       'Photo partagée par l''utilisateur avec sa correction (case cochée) : sert à évaluer et entraîner l''IA repas.'
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'meal_feedback' AND field = 'photo');
