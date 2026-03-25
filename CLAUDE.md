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
- **OCR** : Tesseract 5 — self-hosted, CPU only, container `bayen-tesseract` (port 5001 interne)
- **LLM** : Ollama avec mistral:7b — GPU NVIDIA M4000, container `bayen-ollama` (port 11434 interne)
- **Infra** : Unraid (Docker) + Cloudflare Tunnel + Cloudflare Pages + Cloudflare R2
- **Automatisation** : n8n (container partagé existant sur le serveur Unraid)

---

## Contraintes matérielles — LIRE AVANT TOUTE SUGGESTION IA

- GPU serveur : **NVIDIA Quadro M4000 — 8 GB VRAM uniquement**
- Modèle Ollama actif : **mistral:7b** (~5 GB VRAM) — seul modèle autorisé en prod
- **Ne jamais suggérer llava:13b** (10 GB VRAM — impossible sur ce GPU)
- **Ne jamais suggérer llava:7b en prod** (coexistence impossible avec mistral:7b dans 8 GB)
- `OLLAMA_MAX_LOADED_MODELS=1` — un seul modèle en VRAM à la fois
- Tesseract tourne sur **CPU** — zéro VRAM, zéro conflit avec Ollama
- Pipeline OCR : Tesseract → texte brut → mistral:7b → JSON structuré (séquentiel)
- RAM système disponible : 10+ GB pour les containers Docker

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
- Client Tesseract → `frontend/src/lib/tesseract.ts`
- Client Ollama/Mistral → `frontend/src/lib/ollama.ts`
- Algorithme de scoring déterministe → `directus/extensions/bayen-api/src/scoring.ts` (aussi importé côté frontend depuis `frontend/src/lib/scoring.ts`)

---

## Règles importantes

- Ne jamais committer `.env` — utiliser `.env.example` comme template
- Images produits → Cloudflare R2 via Directus (jamais servies directement depuis le serveur)
- Le **score final est TOUJOURS calculé par l'algorithme déterministe** dans `scoring.ts`
- Le LLM (Mistral) extrait et structure les données brutes — il ne calcule jamais le score chiffré
- Tous les textes UI en français en phase 1 — structure i18n Astro en place pour l'arabe (phase 2)
- Tesseract et Ollama ne sont jamais exposés via Cloudflare Tunnel — réseau Docker interne uniquement
- Tester les endpoints Directus custom avec `curl` avant toute intégration frontend

---

## Commandes utiles

```bash
# Dev frontend
cd frontend && npm run dev

# Démarrer tous les services Docker
docker compose up -d

# Logs des services IA
docker compose logs -f bayen-ollama
docker compose logs -f bayen-tesseract

# Installer le modèle Mistral dans Ollama
docker exec -it bayen-ollama ollama pull mistral:7b

# Tester l'OCR Tesseract
curl -X POST http://localhost:5001/ocr \
  -F "image=@test-label.jpg" \
  -F "lang=fra+ara"

# Tester l'endpoint scan principal
curl -X POST http://localhost:8055/custom/scan \
  -H "Content-Type: application/json" \
  -d '{"barcode":"6111080016394","session_id":"test-123"}'

# Tester Mistral via Ollama
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"mistral:7b","prompt":"Retourne du JSON: {\"test\":true}","stream":false}'

# Snapshot schéma Directus (à faire avant chaque modification de schéma)
npx directus schema snapshot ./directus/snapshots/$(date +%Y%m%d).yaml

# Build frontend pour déploiement
cd frontend && npm run build
```

---

## Référence complète

Voir **SPEC.md** à la racine du repo pour le cahier des charges intégral :
modèle de données, algorithme de scoring, pipeline OCR, flows n8n, roadmap, variables d'environnement.
