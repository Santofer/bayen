-- C23 bis : appariement approximatif des noms INCI (fautes de lecture vision).
-- pg_trgm est une extension « trusted » : le propriétaire de la base peut la créer.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS cosmetic_ingredients_inci_trgm ON cosmetic_ingredients USING gin (inci_name gin_trgm_ops);
