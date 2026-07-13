# CLAUDE.md — Bayen (بَيَّن)

## Contexte projet

Bayen est une PWA participative de notation des produits alimentaires au Maroc.
"Bayen" signifie "c'est clair, ça se voit" en darija marocaine.
Développeur : Amine Benboubker / N0.ma / Casablanca.

| | |
|--|--|
| Frontend | bayen.ma (Cloudflare Pages) |
| API | api.bayen.ma (Directus via Cloudflare Tunnel) |
| CDN images | cdn.bayen.ma (Cloudflare R2) |
| Spec complète | SPEC.md à la racine de ce repo |

---

## Stack

- **Frontend** : Astro 5 + React 18 + shadcn/ui + Tailwind v4
- **Backend** : Directus 11 (CMS headless) + PostgreSQL 16
- **OCR** : Tesseract 5 — self-hosted, CPU only, container `bayen-tesseract` (port 5055 hôte → 5000 interne)
- **IA** : serveur **vLLM partagé** (OpenAI-compatible), modèle **Qwen3.5-9B** multimodal (vision native, GPU Blackwell). Endpoint `http://192.168.1.123:8000/v1`.
- **Infra** : Unraid (Docker) + Cloudflare Tunnel + Cloudflare Pages + Cloudflare R2
- **Automatisation** : n8n (container partagé existant sur le serveur Unraid)

---

## Configuration IA — LIRE AVANT TOUTE SUGGESTION IA

- L'IA passe par le **serveur vLLM partagé** (OpenAI-compatible), pas Ollama.
- Modèle unique : **`qwen3.5-9b`** (multimodal, vision native). Pas d'autre modèle à gérer.
- Config par env dans `bayen-tesseract` : `AI_BASE_URL` (= `http://192.168.1.123:8000/v1`), `AI_MODEL` (= `qwen3.5-9b`), `AI_API_KEY` (= `sk-local`, chaîne non vide quelconque).
- Connexion : **IP LAN directe** (`192.168.1.123:8000`), jamais `host.docker.internal`. Le container bridge atteint l'hôte LAN.
- Appels : `POST {AI_BASE_URL}/chat/completions` (header `Authorization: Bearer {AI_API_KEY}`), `response_format:{type:json_object}`, `chat_template_kwargs:{enable_thinking:false}`.
- **Vision** : 1 image par requête en `image_url` data-URL base64, redimensionnée **≤ 768 px** sur le grand côté avant envoi (le serveur cappe à ~768×768).
- `/meal-analyze` (photo de plat) : sortie = ESTIMATION calories en **fourchette** (min/max) + macros + `confiance` (faible|moyenne|elevee). Jamais de chiffre précis inventé, jamais de conseil médical. Si pas un plat → `{"plat":null,...}`.
- `/pipeline` (étiquette produit) : Tesseract OCR → texte → IA parse → JSON nutritionnel par 100g (inchangé côté schéma produit).
- Tesseract tourne sur **CPU** (réseau Docker interne, non exposé via Tunnel).

---

## Conventions de code

- TypeScript strict partout — zéro `any`, typer correctement
- Composants React en `.tsx`, pages Astro en `.astro`
- Imports absolus depuis `@/` (alias configuré dans `tsconfig.json`)
- shadcn/ui pour tous les composants UI — ne pas réinventer les composants de base
- Tailwind v4 uniquement — pas de classes CSS custom sauf cas exceptionnel justifié
- Nommage : `camelCase` variables/fonctions, `PascalCase` composants, `kebab-case` fichiers
- Commentaires en français

---

## Structure API — règles strictes

- Toutes les requêtes Directus passent par le client SDK dans `frontend/src/lib/directus.ts`
- Ne jamais appeler l'API Directus directement depuis les composants React ou les pages Astro
- Endpoints custom Directus → `directus/extensions/bayen-api/src/`
- Pipeline OCR + IA (Tesseract + vLLM Qwen3.5-9B) → `tesseract-api/app.py`, proxifié côté frontend par `frontend/src/pages/api/ocr-score.ts` (étiquettes) et `frontend/src/pages/api/meal-score.ts` (photo de plat)
- Algorithme de scoring déterministe → `directus/extensions/bayen-api/src/scoring.ts` (aussi importé côté frontend depuis `frontend/src/lib/scoring.ts`)

---

## Règles importantes

- Ne jamais committer `.env` — utiliser `.env.example` comme template
- Images produits → Cloudflare R2 via Directus (jamais servies directement depuis le serveur)
- Le **score produit final est TOUJOURS calculé par l'algorithme déterministe** dans `scoring.ts`
- L'IA (Qwen3.5-9B) extrait/structure les données brutes — elle ne calcule jamais le score produit chiffré
- L'analyse photo de plat (`/meal-analyze`) est une **estimation** (fourchettes + confiance), pas un score santé ni un avis médical
- Tous les textes UI en français en phase 1 — structure i18n Astro en place pour l'arabe (phase 2)
- Tesseract n'est jamais exposé via Cloudflare Tunnel — réseau Docker interne uniquement
- Tester les endpoints Directus custom avec `curl` avant toute intégration frontend

---

## Commandes utiles

```bash
# Dev frontend
cd frontend && npm run dev

# Démarrer tous les services Docker
docker compose up -d

# Logs du pipeline OCR + IA
docker compose logs -f bayen-tesseract

# Vérifier le serveur IA vLLM (doit renvoyer qwen3.5-9b)
curl -s http://192.168.1.123:8000/v1/models -H "Authorization: Bearer sk-local"

# Tester l'OCR Tesseract
curl -X POST http://localhost:5055/ocr \
  -F "image=@test-label.jpg" \
  -F "lang=fra+ara"

# Tester l'analyse photo de plat (vision Qwen3.5-9B)
curl -X POST http://localhost:5055/meal-analyze -F "image=@plat.jpg"

# Tester le pipeline étiquette (Tesseract + IA)
curl -X POST http://localhost:5055/pipeline -F "image_nutrition=@label.jpg"

# Tester l'endpoint scan principal
curl -X POST https://api.bayen.ma/bayen-api/scan \
  -H "Content-Type: application/json" \
  -d '{"barcode":"6111080016394","session_id":"test-123"}'

# Tester le résumé nutrition (auth requise — token statique admin)
curl https://api.bayen.ma/bayen-api/nutrition-summary \
  -H "Authorization: Bearer <token>"

# Backfill images produits (auto : cron nightly 04:30 sur le serveur ;
# script scripts/backfill-images.py exécuté DANS bayen-tesseract)

# Snapshot schéma Directus (à faire avant chaque modification de schéma)
npx directus schema snapshot ./directus/snapshots/$(date +%Y%m%d).yaml

# Build frontend pour déploiement
cd frontend && npm run build
```

---

## Référence complète

Voir **SPEC.md** à la racine du repo pour le cahier des charges intégral :
modèle de données, algorithme de scoring, pipeline OCR, flows n8n, roadmap, variables d'environnement.
