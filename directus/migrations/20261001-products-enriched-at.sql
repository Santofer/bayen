-- Passe d'enrichissement : date du dernier examen (une fiche sans issue n'est revue qu'après 30 jours)
ALTER TABLE products ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
INSERT INTO directus_fields (collection, field, special, interface, display, readonly, hidden, required, sort, width, note)
SELECT 'products', 'enriched_at', NULL, 'datetime', 'datetime', true, false, false, 34, 'half',
       'Dernier passage de la cascade d''enrichissement (POST /bayen-api/estimate-and-score).'
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'products' AND field = 'enriched_at');
