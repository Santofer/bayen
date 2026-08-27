# PLAN C11–C13 — Qualité produits scannés · Tracking · Profil santé

> Rédigé par Fable (planification) pour exécution par Opus 5, session du 2026-08-27.
> Contexte : voir CLAUDE.md. Exécuter les chantiers DANS L'ORDRE, un commit par chantier,
> vérification E2E avant chaque commit. Supprimer ce fichier au dernier commit (C13).

## Constats chiffrés qui motivent le plan (mesurés le 27/08)

- 47 scans/7j (vs 19 la semaine d'avant), rythme organique 10–45/semaine depuis juin.
- **239 produits published sans vrai nom** (name_fr = « Produit sans nom », code-barres, vide,
  < 3 chars) dont **193 avec image_front** ; 350 marques inconnues ; 243 sans score.
  Le produit le plus scanné du mois est « Produit sans nom » (26 scans).
- **Tracking cassé** : `frontend/src/pages/produit/[barcode].astro:260` envoie
  `session_id: auto-${Date.now()}` à chaque vue SSR → 1 scan = 1 session, bots inclus,
  `device_type` et `user_id` jamais remplis. `getSessionId()` de
  `frontend/src/lib/directus.ts:326` (localStorage, correct) n'est appelé nulle part.
- 0 meal_scan, 0 contribution, 13 comptes → features à friction, hors périmètre ici (C14+).

## Pièges connus de la codebase (NE PAS redécouvrir)

1. **Service worker** : jamais actif sur localhost (Layout le désinscrit) mais en prod il
   peut servir du stale ~1 rechargement. Ne pas s'affoler en vérifiant la prod.
2. **Classes arbitraires Tailwind non fiables** dans ce projet : pour toute géométrie
   critique, utiliser des styles inline ou des classes composant dans
   `frontend/src/styles/globals.css` (voir sections `.hero-*`, `.pcard-v2`).
3. **Déploiement app.py** : la source du repo est `tesseract-api/app.py`, bakée dans
   l'image. Déployer = `scp tesseract-api/app.py root@192.168.1.123:/mnt/user/appdata/bayen/app.py`
   puis `docker cp /mnt/user/appdata/bayen/app.py bayen-tesseract:/app/app.py && docker restart bayen-tesseract`,
   puis `curl -s http://localhost:5055/health` (sur le serveur) doit répondre 200.
4. **Scripts batch** : pattern = scripts/*.py exécutés via
   `docker exec -e DTOKEN="$(cat /mnt/user/appdata/bayen/scripts/.directus-token)" -i bayen-tesseract python3 - < script.py`.
   Toujours : dry-run `APPLY=0` d'abord, idempotence obligatoire, `ONLY_BARCODE` pour cibler.
5. **Crons persistants Unraid** : crontab live ET append dans `/boot/config/go`
   (pattern `(crontab -l | grep -v '# tag'; echo '...') | crontab -`). Crons bayen existants :
   3h00 backup · 4h30 backfill-images · 5h00 estimate-scores · 5h30 categorize ·
   6h00 translate-ingredients · 6h30 link-ingredients · 7h00 ocr-ingredients · 7h30 clean-nonfood.
6. **Extension Directus** : build avec `cd directus/extensions/bayen-api && npm run build`,
   déployer = `scp dist/*.js root@…:/mnt/user/appdata/bayen/directus/extensions/bayen-api/dist/`
   + `docker restart bayen-directus` (attendre ~12 s, health sur :8055/server/health).
7. **Frontend** : build de validation `cd frontend && npm run build` avant chaque commit.
   Dev server via preview_start `bayen-dev` (jamais Bash). Purger `node_modules/.vite .astro`
   et tuer les `astro dev` zombies si le CSS semble stale.
8. **Création de champ Directus par API** : POST /fields/products avec le token admin
   fonctionne (fait pour `ingredients_ocr_at`).

---

## C11 — Nommer les produits sans nom (vision) + marques

**But** : plus aucun produit scanné qui s'affiche « Produit sans nom ».

### C11a — endpoint IA
Dans `tesseract-api/app.py`, ajouter `/identify-product` :
- Entrée : multipart `image` (photo face avant).
- Prompt système : expert produits alimentaires marocains ; lire l'emballage et retourner
  UNIQUEMENT du JSON : `{"name_fr": "...", "brand": "...", "quantity": "430 g|null",
  "confiance": "faible|moyenne|elevee"}`. Règles : name_fr = nom commercial court en
  français (translittérer l'arabe si besoin, ex. « Raïbi Jamila »), brand = marque exacte
  de l'emballage, `null` si illisible — ne JAMAIS inventer.
- Implémentation : réutiliser `resize_for_ai` + `call_ai_vision` (max_tokens=300).

### C11b — script batch `scripts/name-products.py`
- Cible : products published où
  `name_fr ILIKE 'produit sans nom%' OR name_fr ~ '^[0-9]{8,14}$' OR name_fr IS NULL OR length(trim(name_fr)) < 3`
  ET `image_front IS NOT NULL`. Directus ne fait pas de regex → récupérer les candidats
  larges (`fields=id,barcode,name_fr,brand,image_front`, limit -1) et filtrer en Python
  (réutiliser la même regex). Aussi : produits avec nom OK mais
  `brand null/vide/Inconnu/Marque inconnue` → même appel vision, ne PATCHer que brand.
- Pour chaque : télécharger `{DIRECTUS}/assets/{image_front}?width=768&access_token={token}`
  (si image_front est un UUID ; si ça commence par http, télécharger l'URL directement),
  POST multipart à `/identify-product` (réutiliser le `post_multipart` de
  `scripts/ocr-ingredients-images.py`).
- PATCH products : `name_fr` (si confiance != faible ET name non null), `brand` (idem),
  `quantity` si null en base. Ne jamais écraser un name_fr existant valide (seulement les
  candidats filtrés). Marquage idempotence : les produits renommés sortent naturellement
  du filtre ; pour les échecs vision récurrents, tenir un compteur en log seulement
  (MAX_PRODUCTS=60 par run, le cron ratisse).
- Env : APPLY, ONLY_BARCODE, MAX_PRODUCTS, CHUNK non nécessaire (1 image = 1 appel).
- **Dry-run obligatoire sur ~10 produits, montrer le tableau avant→après dans le chat,
  PUIS run réel** (l'utilisateur a historiquement validé sur dry-run montré).
- Après le run : `docker exec bayen-tesseract python3` n'est PAS nécessaire pour vérifier —
  vérifier via l'API publique que « Produit sans nom » a disparu du top scans :
  `products?filter[name_fr][_icontains]=produit sans nom&aggregate[count]=id`.
- Cron nightly **8h00** : `scripts/name-products.sh` (copier le pattern de
  `clean-nonfood-ingredients.sh`), crontab + go file, tag `# bayen name-products`.

### C11c — estimation des scores manquants (bonus si simple)
243 produits sans score. Le cron estimate-scores (5h00) cible déjà les produits sans
données. Vérifier pourquoi il en reste 243 : lire
`/mnt/user/appdata/bayen/backups/estimate-scores.log` (tail -30). Si le script filtre trop
étroitement (ex. exige name_fr exploitable), le C11b va justement débloquer beaucoup de
produits → ne rien coder, juste noter dans le commit que la chaîne nightly rattrapera.

---

## C12 — Tracking réel (sessions, devices, bots)

**But** : mesurer utilisateurs récurrents, appareils, et exclure les bots — sans cookie
bannière (pas de données perso : UUID anonyme, pas de fingerprinting).

### C12a — cookie session côté client
Dans `frontend/src/layouts/Layout.astro`, script `is:inline` (dans le moteur existant) :
```js
try {
  var sid = localStorage.getItem('bayen_session_id');
  if (!sid) { sid = crypto.randomUUID(); localStorage.setItem('bayen_session_id', sid); }
  var dev = window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
  document.cookie = 'bayen_sid=' + sid + ';path=/;max-age=31536000;SameSite=Lax';
  document.cookie = 'bayen_device=' + dev + ';path=/;max-age=31536000;SameSite=Lax';
} catch (e) {}
```
(Réutilise la MÊME clé localStorage que `getSessionId()` pour cohérence.)

### C12b — la fiche produit transmet la vraie session
`frontend/src/pages/produit/[barcode].astro` (~ligne 255) :
- Lire `Astro.cookies.get('bayen_sid')?.value` et `bayen_device`.
- **Détection bot** : `const ua = Astro.request.headers.get('user-agent') ?? ''` ;
  regex `/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|lighthouse|headless/i`.
- Appeler `/bayen-api/scan` avec :
  `session_id: sid ?? 'anon-ssr'`, `device_type`, `is_bot` (bool).
  ⚠️ Première visite d'un nouvel utilisateur : le cookie n'existe pas encore au premier
  hit SSR → `anon-ssr` est attendu et acceptable (la 2e page aura le cookie).
- NOTE : ne PAS bloquer l'affichage si le scan échoue (comportement actuel à préserver).

### C12c — extension scan.ts
`directus/extensions/bayen-api/src/scan.ts` :
- Accepter `device_type` et `is_bot` dans le body.
- Si `is_bot` → **ne pas insérer de ligne scans** (mais répondre normalement : le bot
  doit voir la fiche pour le SEO). Sinon insérer avec `device_type`.
- `user_id` : hors périmètre (les scans SSR n'ont pas le JWT — noter dans le commit).
- Rebuild + redéploiement extension (piège n°6).

### C12d — vérification E2E
1. Dev : ouvrir une fiche produit avec le dev server, vérifier dans la DB (SQL sur le
   serveur… la fiche dev pointe vers l'API PROD → le scan part en prod : vérifier
   qu'une ligne scans récente porte le session_id du cookie du navigateur et
   `device_type='desktop'`, puis recharger la page → MÊME session_id).
2. `curl -A "Googlebot" https://…` après déploiement prod → aucune ligne insérée
   (à vérifier post-déploiement Cloudflare, sinon vérifier en local contre l'API).
3. Bonus dashboard : NE PAS construire de page admin maintenant. Ajouter seulement le
   SQL de suivi dans le commit message (scans/j, sessions distinctes/j, % mobile).

---

## C13 — Profil santé local « Mon profil » (différenciateur vs Yuka Premium)

**But** : l'utilisateur déclare ce qu'il évite ; au scan, bandeau d'alerte si le produit
le contient. Sans compte : localStorage. Gratuit là où Yuka le fait payer.

### C13a — lib `frontend/src/lib/health-profile.ts`
```ts
export interface HealthProfile {
  allergens: string[]   // clés canoniques: gluten, lait, oeufs, arachide, fruits_coque,
                        // soja, poisson, crustaces, sesame, moutarde, celeri, lupin, sulfites
  avoidAdditives: string[]  // codes E exacts (E621…)
  avoidPalmOil: boolean
}
```
- `getProfile() / saveProfile()` : localStorage `bayen_health_profile`, pub/sub
  CustomEvent `bayen-profile-change` (copier le pattern de `frontend/src/lib/cart.ts`).
- `checkProduct(profile, { additives, structured_ingredients, traces, ingredients_text })`
  → `{ hits: Array<{type:'allergen'|'additive'|'palm', label:string, source:'ingredient'|'trace'}> }`.
  Matching allergènes : sur `structured_ingredients[].is_allergen` + `allergen_type`
  + fallback regex sur les noms FR (table de synonymes par clé canonique : gluten→blé/
  orge/seigle/avoine, lait→lactose/lactosérum/crème/beurre…, huile de palme→palme/palmiste).
  Traces → hit avec `source:'trace'` (affiché « peut contenir »).

### C13b — composant `HealthProfileEditor.tsx`
- Pills togglables : 13 allergènes (labels FR/darija — nouvelles clés i18n
  `profile.allergen.*`), toggle huile de palme, et pour les additifs réutiliser la
  MÊME source que la recherche : fetch `items/additives?filter[risk_level][_in]=banned_ma,avoid,limited`
  (pattern dans `SearchPage.tsx` → `RiskyAdditive`).
- Placement : nouvelle page `/profil` (prerender=false, layout standard, carte v2
  `rounded-3xl border bg-card shadow-card`) + lien dans le mega menu **Outils**
  (icône user déjà dans NAV_ICONS de Layout.astro) + entrée `nav.profile` i18n.
- Un bouton « Mon profil » discret aussi sur la fiche produit à côté du bandeau (voir C13c).

### C13c — bandeau d'alerte sur la fiche produit
- Nouveau composant `ProfileAlert.tsx` (client:load), monté dans
  `frontend/src/pages/produit/[barcode].astro` juste APRÈS la card en-tête produit,
  props : additives / structured_ingredients / traces / ingredients_text (déjà tous
  disponibles dans la page).
- Rendu : rien si profil vide ou aucun hit. Si hits :
  bandeau `rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4`
  « ⚠ Contient ce que tu évites : Gluten (ingrédient), E322 (additif) » ;
  variante orange si UNIQUEMENT des traces (« Peut contenir : … »).
  Lien « Modifier mon profil → /profil ».
- i18n : `profile.alertContains`, `profile.alertTraces`, `profile.edit`, etc. (FR + darija).

### C13d — intégration recherche (léger)
Dans `SearchPage.tsx` : si un profil avec `avoidAdditives` existe, afficher un ToggleChip
« Filtrer selon mon profil » qui injecte les codes du profil dans
`filters.excludeAdditives` (le plumbing C8c existe déjà — ne rien créer côté backend).

### C13e — vérification E2E (checklist stricte)
1. /profil : cocher gluten + E322 → recharger → persisté.
2. Fiche Nutella (61112450…? utiliser un produit avec E322 : chercher via
   `/bayen-api/search-products?has_additive=E322&limit=1`) → bandeau rouge listant E322.
3. Produit avec trace gluten (ex. le yaourt vu en session ou `sergio` barcode
   6111259347502 qui a traces Œufs/Fruits à coque/Arachides → cocher arachide) →
   bandeau orange « peut contenir ».
4. Produit propre → aucun bandeau. Profil vide → aucun bandeau.
5. Recherche : toggle profil → compte de résultats diminue, requête passe par
   `/bayen-api/search-products?exclude_additives=…`.
6. Dark mode + darija (RTL) sur /profil et le bandeau.
7. Build prod OK.

---

## Ordre d'exécution et commits

1. `feat(ia): C11 — identification vision des produits sans nom` (endpoint + script +
   dry-run montré + run réel + cron 8h00 + CLAUDE.md mis à jour section crons).
2. `feat(tracking): C12 — sessions réelles, device, exclusion bots` (Layout + fiche +
   extension redéployée + vérif SQL).
3. `feat(profil): C13 — profil santé local + alertes au scan` (lib + page + bandeau +
   filtre recherche + i18n).
4. Chaque commit : build frontend OK au préalable ; push après chaque commit (déploiement
   Cloudflare auto). Mémoire : ajouter le cron 8h00 à la note infra existante,
   et signaler tout nouveau point en suspens.
5. Supprimer PLAN-C11-C13.md dans le commit C13.
