-- Sécurité : restreindre la permission update sur products.
--
-- La policy « Utilisateur » avait `update *` : n'importe quel compte connecté
-- pouvait modifier N'IMPORTE QUEL champ de n'importe quel produit via l'API —
-- y compris scan_score, confidence_score, status ou created_by. Découvert en
-- réparant le bouton « Confirmer » qui s'appuyait dessus pour PATCHer la
-- confiance côté client.
--
-- La liste blanche couvre exactement ce que le formulaire « Corriger /
-- compléter » édite : identité, nutrition, ingrédients, photos. Les champs
-- calculés ou de confiance ne bougent que côté serveur.

BEGIN;

UPDATE directus_permissions
SET fields = 'name_fr,name_ar,brand,quantity,category_id,ingredients_text,energy_kcal,fat_total,fat_saturated,carbs_total,sugars,fiber,proteins,salt,image_front,image_nutrition,image_ingredients'
WHERE policy = '8e5e4986-8489-455c-be61-03cae906395c'
  AND collection = 'products'
  AND action = 'update';

COMMIT;

SELECT action, fields FROM directus_permissions
WHERE policy = '8e5e4986-8489-455c-be61-03cae906395c'
  AND collection = 'products' AND action = 'update';
