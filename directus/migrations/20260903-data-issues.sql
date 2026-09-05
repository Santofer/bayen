-- Garde-fous nutritionnels : anomalies restantes consignées sur la fiche (admin + badge « à vérifier »)
ALTER TABLE products ADD COLUMN IF NOT EXISTS data_issues JSONB;
INSERT INTO directus_fields (collection, field, special, interface, display, readonly, hidden, required, sort, width, note)
SELECT 'products', 'data_issues', 'cast-json', 'input-code', 'raw', true, false, false, 33, 'full',
       'Anomalies nutritionnelles détectées par l''audit nightly (POST /bayen-api/audit-nutrition). NULL = rien à signaler.'
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'products' AND field = 'data_issues');
