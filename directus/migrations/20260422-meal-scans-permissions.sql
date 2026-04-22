-- Permissions Directus pour meal_scans
--
-- Policy "Utilisateur" (rôle des comptes public) : un user peut lire
-- UNIQUEMENT ses propres scans. La création passe par l'endpoint custom
-- /bayen-api/meal-scan qui fait un INSERT admin via Knex (bypass policies).
-- Pas de update/delete en phase 1.

BEGIN;

-- On n'utilise pas ON CONFLICT (sur quoi ?), mais la migration vérifie
-- avant d'insérer pour rester idempotente.
INSERT INTO directus_permissions (policy, collection, action, fields, permissions, validation)
SELECT
  '8e5e4986-8489-455c-be61-03cae906395c'::uuid,
  'meal_scans',
  'read',
  'id,plat,description,image,meal_score,score_label,estimated_kcal,estimated_portion,ingredients,nutrition,nova_group,is_beverage,confidence,date_created',
  '{"user_id":{"_eq":"$CURRENT_USER"}}'::json,
  '{}'::json
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE policy = '8e5e4986-8489-455c-be61-03cae906395c'::uuid
    AND collection = 'meal_scans'
    AND action = 'read'
);

COMMIT;

SELECT policy, collection, action, fields
FROM directus_permissions
WHERE collection = 'meal_scans';
