# Bayen (بَيَّن) — Spec technique

> Version 1.1 — Mars 2026
> Projet : Application web participative de notation des produits alimentaires au Maroc
> Nom : **Bayen** (بَيَّن) — "c'est clair, ça se voit"
> Développeur : Amine Benboubker / N0.ma / Casablanca
> Domaine : `bayen.ma`

---

## Table des matières

1. [Vision produit](#1-vision-produit)
2. [Stack technique](#2-stack-technique)
3. [Architecture infrastructure](#3-architecture-infrastructure)
4. [Contraintes matérielles — GPU M4000](#4-contraintes-matérielles--gpu-m4000)
5. [Modèle de données Directus](#5-modèle-de-données-directus)
6. [Pipeline de scoring](#6-pipeline-de-scoring)
7. [Intégration OCR et LLM local](#7-intégration-ocr-et-llm-local)
8. [API Backend](#8-api-backend)
9. [Frontend PWA](#9-frontend-pwa)
10. [Système de contribution communautaire](#10-système-de-contribution-communautaire)
11. [Algorithme de scoring](#11-algorithme-de-scoring)
12. [Flows n8n](#12-flows-n8n)
13. [Sécurité et modération](#13-sécurité-et-modération)
14. [SEO et performance](#14-seo-et-performance)
15. [Monétisation phase 2](#15-monétisation-phase-2)
16. [Roadmap et phases](#16-roadmap-et-phases)
17. [Variables d'environnement](#17-variables-denvironnement)
18. [Structure du repo](#18-structure-du-repo)

---

## 1. Vision produit

### Problème

Les produits alimentaires vendus au Maroc — produits locaux, importés, grande surface, épicerie — ne sont pas référencés dans les bases de données mondiales comme Open Food Facts. Le consommateur marocain n'a aucun outil pour évaluer la qualité nutritionnelle d'un produit Bimo, Centrale Laitière, Koutoubia, Doha ou d'un produit non étiqueté en français.

### Solution

Bayen est une PWA qui permet de :
- Scanner le code-barres d'un produit alimentaire
- Obtenir instantanément un score de qualité nutritionnelle (0–100)
- Contribuer à la base de données en ajoutant des produits manquants via photo
- Consulter les additifs, le Nutri-Score et le niveau de transformation NOVA

### Identité

| | |
|--|--|
| Nom français | Bayen |
| Nom arabe | بَيَّن |
| Signification | "C'est clair / ça se voit" — darija marocaine |
| Domaine | `bayen.ma` |
| Tagline FR | "Scannez. Comprenez. Choisissez mieux." |
| Tagline AR | "امسح. افهم. اختر أحسن." |

### Différenciation vs Yuka

- Base de données 100% construite par et pour les consommateurs marocains
- Interface en français ET arabe (darija possible en phase 2)
- Scoring adapté aux produits locaux, pas de biais européen
- Modèle participatif : chaque utilisateur peut enrichir la base
- Zéro dépendance à une API payante externe (tout tourne en local sur Unraid)
- Open source à terme

---

## 2. Stack technique

### Frontend

| Outil | Version | Rôle |
|-------|---------|------|
| Astro | 5.x | Framework principal, SSR + pages statiques |
| React | 18.x | Composants interactifs (îles Astro) |
| shadcn/ui | latest | Composants UI (Radix primitives) |
| Tailwind CSS | v4 | Styles |
| Workbox | 7.x | PWA / Service Worker |

### Backend

| Outil | Version | Rôle |
|-------|---------|------|
| Directus | 11.x | CMS headless, API REST + GraphQL |
| PostgreSQL | 16 | Base de données principale |
| Node.js | 20 LTS | Scripts, extensions Directus |

### IA / OCR

| Outil | Rôle |
|-------|------|
| Ollama + mistral:7b | Parsing ingrédients, détection additifs — GPU M4000 |
| Tesseract 5 (container Flask) | OCR — CPU uniquement, self-hosted, zéro VRAM |

> Pas de modèle multimodal (llava) en prod — voir §4.

### Infrastructure

| Outil | Rôle |
|-------|------|
| Unraid | Serveur hôte Docker |
| Cloudflare Tunnel | Exposition publique de l'API sans port forwarding |
| Cloudflare Pages | Déploiement frontend |
| Cloudflare R2 | Stockage images (S3-compatible, zéro egress fees) |
| n8n | Automatisation (container partagé existant) |

---

## 3. Architecture infrastructure

### Containers Docker sur Unraid

```
bayen-directus      → Directus 11 (port 8055 interne)
bayen-postgres      → PostgreSQL 16 (port 5432 interne)
bayen-ollama        → Ollama + mistral:7b (port 11434 interne, GPU M4000)
bayen-tesseract     → API Tesseract Flask (port 5001 interne, CPU only)
n8n                 → partagé, déjà existant
```

### Exposition publique

```
api.bayen.ma   →  bayen-directus:8055  (via Cloudflare Tunnel)
cdn.bayen.ma   →  Cloudflare R2 public bucket
bayen.ma       →  Cloudflare Pages (build Astro statique)
```

Tesseract et Ollama ne sont jamais exposés publiquement — réseau Docker interne uniquement.

### Flux de données

```
Utilisateur mobile
    ↓ HTTPS
Cloudflare Pages (bayen.ma)
    ↓ fetch()
api.bayen.ma (Directus via Cloudflare Tunnel)
    ↓ réseau Docker interne
PostgreSQL + R2 (images) + Tesseract (OCR) + Ollama (parsing)
```

### Stockage images

- Bucket R2 : `bayen-products`
- CDN public : `cdn.bayen.ma`
- Taille max upload : 5 MB
- Formats : JPG, PNG, WebP
- Intégration : Directus Storage Adapter S3-compatible

---

## 4. Contraintes matérielles — GPU M4000

> ⚠️ **PÉRIMÉ (juin 2026).** Cette section décrit l'architecture IA initiale
> (Ollama + mistral:7b/gemma sur GPU M4000). **L'IA passe désormais par un
> serveur vLLM partagé servant Qwen3.5-9B multimodal (GPU Blackwell), endpoint
> `http://192.168.1.123:8000/v1`.** Voir la section « Configuration IA » de
> `CLAUDE.md` pour la config courante (`AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`).
> Les contraintes VRAM ci-dessous ne s'appliquent plus.

### Configuration serveur

| Composante | Détail |
|------------|--------|
| GPU | NVIDIA Quadro M4000 |
| VRAM | **8 GB GDDR5** |
| RAM système | 10+ GB disponible pour Docker |
| CPU | Disponible pour Tesseract (pas de GPU) |

### Décision architecturale

| Modèle | VRAM requise | Verdict |
|--------|-------------|---------|
| `llava:13b` | ~10 GB | ❌ Impossible |
| `llava:7b` + `mistral:7b` simultanés | ~11 GB | ❌ Impossible |
| `mistral:7b` seul | ~5 GB | ✅ Retenu |
| Tesseract | 0 GB (CPU) | ✅ Retenu |

**Architecture retenue : Tesseract (CPU) + Mistral:7b (GPU)**

Tesseract gère l'OCR sur le CPU, Mistral:7b gère le parsing des ingrédients sur le GPU. Les deux fonctionnent sans conflit de VRAM. Latence totale Chemin B : 10–25 secondes, acceptable pour une contribution ponctuelle.

### Config Ollama dans docker-compose.yml

```yaml
bayen-ollama:
  image: ollama/ollama:latest
  container_name: bayen-ollama
  restart: unless-stopped
  volumes:
    - /mnt/user/appdata/bayen-ollama:/root/.ollama
  environment:
    - OLLAMA_KEEP_ALIVE=5m
    - OLLAMA_MAX_LOADED_MODELS=1
    - OLLAMA_NUM_GPU=1
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
  networks:
    - bayen-internal
```

Modèle à installer après démarrage :
```bash
docker exec -it bayen-ollama ollama pull mistral:7b
```

---

## 5. Modèle de données Directus

### Collection : `products`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Clé primaire |
| `barcode` | string unique indexed | EAN-13 ou EAN-8 |
| `name_fr` | string | Nom en français |
| `name_ar` | string | Nom en arabe (optionnel) |
| `brand` | string | Marque |
| `category_id` | M2O → categories | |
| `image_front` | file R2 | Photo face avant |
| `image_nutrition` | file R2 | Photo tableau nutritionnel |
| `image_ingredients` | file R2 | Photo liste ingrédients |
| `nutriscore_grade` | enum A/B/C/D/E | |
| `nova_group` | integer 1–4 | |
| `scan_score` | integer 0–100 | Score global Bayen |
| `score_label` | enum | excellent / bon / médiocre / mauvais |
| `energy_kcal` | float | Pour 100g |
| `fat_total` | float | Lipides pour 100g |
| `fat_saturated` | float | AGS pour 100g |
| `carbs_total` | float | Glucides pour 100g |
| `sugars` | float | Sucres pour 100g |
| `fiber` | float | Fibres pour 100g |
| `proteins` | float | Protéines pour 100g |
| `salt` | float | Sel pour 100g |
| `ingredients_text` | text | Liste ingrédients brute |
| `additives` | JSON array | Ex: `["E471","E150d"]` |
| `allergens` | JSON array | Ex: `["gluten","lactose"]` |
| `is_organic` | boolean | |
| `is_halal` | boolean | |
| `origin_country` | string | |
| `off_id` | string | ID Open Food Facts si existant |
| `data_source` | enum | off / user / ocr_tesseract / manual |
| `status` | enum | draft / pending_review / published / rejected |
| `confidence_score` | float 0–1 | 1 = données vérifiées manuellement |
| `ocr_raw_text` | text | Texte brut Tesseract (debug) |
| `ocr_confidence` | float | Score confiance Tesseract 0–100 |
| `scan_count` | integer | |
| `date_created` | datetime | |
| `date_updated` | datetime | |
| `created_by` | M2O → directus_users | |

### Collection : `categories`

| Champ | Type |
|-------|------|
| `id` | integer |
| `name_fr` | string |
| `name_ar` | string |
| `slug` | string unique |
| `parent_id` | M2O → categories (self) |
| `icon` | string (lucide icon name) |

Catégories initiales : Biscuits & gâteaux, Céréales & petit-déjeuner, Produits laitiers, Charcuterie & viandes, Boissons sucrées, Eaux & jus, Conserves, Épices & condiments, Huiles & graisses, Snacks & chips, Pain & viennoiseries, Plats préparés.

### Collection : `additives`

| Champ | Type |
|-------|------|
| `id` | string ex: "E471" |
| `name_fr` | string |
| `function` | string (émulsifiant, colorant…) |
| `risk_level` | enum safe / limited / avoid / banned_ma |
| `description_fr` | text |
| `sources` | JSON |

### Collection : `scans`

| Champ | Type |
|-------|------|
| `id` | UUID |
| `product_id` | M2O → products |
| `user_id` | M2O → directus_users nullable |
| `session_id` | string anonyme |
| `device_type` | string |
| `date_created` | datetime |

### Collection : `contributions`

| Champ | Type |
|-------|------|
| `id` | UUID |
| `product_id` | M2O → products |
| `user_id` | M2O → directus_users |
| `type` | enum new_product / fix_data / add_image / confirm |
| `data_before` | JSON |
| `data_after` | JSON |
| `status` | enum pending / approved / rejected |
| `reviewed_by` | M2O → directus_users |
| `date_created` | datetime |

### Collection : `ai_logs`

| Champ | Type |
|-------|------|
| `id` | UUID |
| `product_id` | M2O → products nullable |
| `type` | enum ocr_tesseract / mistral_parsing |
| `input` | text |
| `output` | text |
| `duration_ms` | integer |
| `success` | boolean |
| `error_message` | string |
| `date_created` | datetime |

### Extension utilisateurs

Champs ajoutés sur `directus_users` :

| Champ | Type |
|-------|------|
| `display_name` | string |
| `points` | integer |
| `contributions_count` | integer |
| `rank` | enum nouveau / contributeur / expert / vérifié |

### Permissions Directus

| Rôle | Droits |
|------|--------|
| Public | READ products (status=published), READ categories, READ additives |
| Contributeur | + CREATE products (draft), CREATE contributions, CREATE scans |
| Modérateur | + UPDATE products.status, UPDATE contributions.status |
| Admin | Full access |

---

## 6. Pipeline de scoring

### Chemin A — Produit connu

```
barcode → Query Directus (status=published)
  ↓ trouvé → Scoring algorithmique → réponse < 200ms

barcode → Query Directus → non trouvé
  ↓ → Fetch Open Food Facts API
  ↓ trouvé → Import en base (data_source=off) → Scoring → réponse < 2s
  ↓ non trouvé → { found: false, contribute_url }
```

### Chemin B — Produit inconnu (contribution)

```
Photo étiquette nutrition + ingrédients
    ↓
POST /custom/ocr-score
    ↓
[1] Tesseract OCR (CPU ~2–5s)
    → texte brut + score confiance
    → si confiance < 60 → demander meilleure photo
    ↓
[2] Mistral:7b (GPU ~8–15s)
    → parsing ingrédients → JSON structuré
    → détection additifs E-xxx + risques
    → groupe NOVA
    ↓
[3] Algorithme scoring déterministe
    ↓
Création fiche draft (status=pending_review)
    ↓
Score provisoire + badge "Non vérifié" → affiché à l'utilisateur
    ↓
n8n → notification modérateur
```

### Temps de réponse cibles

| Chemin | Cible |
|--------|-------|
| A — base Directus | < 200ms |
| A — import OFF | < 2s |
| B — OCR + parsing complet | 10–25s |

---

## 7. Intégration OCR et LLM local

### 7.1 Tesseract — container self-hosted

**`tesseract-api/Dockerfile` :**
```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-ara \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir
COPY app.py .

EXPOSE 5000
CMD ["python", "app.py"]
```

**`tesseract-api/requirements.txt` :**
```
flask==3.0.0
pytesseract==0.3.10
Pillow==10.2.0
```

**`tesseract-api/app.py` :**
```python
from flask import Flask, request, jsonify
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import io

app = Flask(__name__)

def preprocess_image(image):
    image = image.convert('L')
    image = ImageEnhance.Contrast(image).enhance(2.0)
    image = image.filter(ImageFilter.SHARPEN)
    return image

@app.route('/ocr', methods=['POST'])
def ocr():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    file = request.files['image']
    lang = request.form.get('lang', 'fra+ara')
    preprocess = request.form.get('preprocess', 'true').lower() == 'true'
    try:
        image = Image.open(io.BytesIO(file.read()))
        if preprocess:
            image = preprocess_image(image)
        data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
        confidences = [c for c in data['conf'] if c > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        text = pytesseract.image_to_string(image, lang=lang)
        return jsonify({
            'text': text.strip(),
            'confidence': round(avg_confidence, 1),
            'lang': lang,
            'word_count': len([w for w in text.split() if len(w) > 1])
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'tesseract_version': str(pytesseract.get_tesseract_version())})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
```

**Seuils de qualité OCR :**

| Confiance Tesseract | Action |
|---------------------|--------|
| ≥ 70 | Continuer vers Mistral |
| 50–69 | Continuer, flag `low_confidence`, badge "Vérification recommandée" |
| < 50 | Rejeter, demander une meilleure photo à l'utilisateur |

**Guide photo affiché dans l'UI :**
- Cadrer uniquement le tableau nutritionnel
- Lumière directe, pas de reflet
- Photo droite, pas d'angle
- Distance 15–25 cm
- Résolution minimale 1MP

### 7.2 Mistral:7b — parsing via Ollama

**Prompt système (fixe, passé à chaque appel) :**
```
Tu es un expert en nutrition et en réglementation alimentaire européenne et marocaine.
Tu analyses des listes d'ingrédients et des données nutritionnelles extraites d'étiquettes de produits alimentaires.
Tu retournes UNIQUEMENT du JSON valide. Aucun texte avant ou après le JSON. Aucun markdown.
```

**Prompt — parsing ingrédients :**
```
Analyse la liste d'ingrédients suivante extraite d'une étiquette marocaine.

Liste d'ingrédients : {{INGREDIENTS_TEXT}}

Retourne ce JSON exact :
{
  "additives_found": [
    {"code": "E471", "name": "Mono et diglycérides d'acides gras", "risk": "limited"}
  ],
  "nova_group": 4,
  "nova_reason": "Présence d'arômes artificiels et d'émulsifiants de synthèse",
  "processing_indicators": ["arômes artificiels", "huile hydrogénée"],
  "allergens_detected": ["gluten", "lait"],
  "parsing_confidence": 0.85
}

Niveaux de risque : safe / limited / avoid / banned_ma
Groupes NOVA : 1 (non transformé) / 2 (ingrédients culinaires) / 3 (transformé) / 4 (ultra-transformé)
```

**Prompt — structuration données nutritionnelles depuis texte OCR brut :**
```
Voici le texte brut extrait par OCR d'un tableau nutritionnel marocain (peut contenir des erreurs OCR) :

{{OCR_RAW_TEXT}}

Extrait les valeurs nutritionnelles pour 100g. Retourne ce JSON exact :
{
  "product_name": "...",
  "brand": "...",
  "net_weight": "...",
  "energy_kcal_100g": null,
  "fat_total_100g": null,
  "fat_saturated_100g": null,
  "carbs_total_100g": null,
  "sugars_100g": null,
  "fiber_100g": null,
  "proteins_100g": null,
  "salt_100g": null,
  "ingredients_text": "...",
  "parsing_notes": "..."
}

Si une valeur est illisible ou absente, mets null. Ne jamais inventer de valeurs.
```

**Gestion erreurs Mistral — pattern retry :**
```typescript
async function callMistral(prompt: string, retries = 2): Promise<object> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral:7b',
          prompt,
          stream: false,
          options: { temperature: 0.1 }
        }),
        signal: AbortSignal.timeout(30000)
      })
      const data = await response.json()
      return JSON.parse(data.response.trim())
    } catch (e) {
      if (attempt === retries) {
        await logAiError('mistral_parsing', prompt, e.message)
        throw new Error('MISTRAL_FAILED')
      }
      await new Promise(r => setTimeout(r, 2000))
    }
  }
}
```

Si Mistral échoue 2 fois → contribution enregistrée `status: manual_required` → notification n8n modérateur.

---

## 8. API Backend

### Endpoints natifs Directus

```
GET  /items/products?filter[barcode][_eq]={barcode}&filter[status][_eq]=published
GET  /items/products/{id}
GET  /items/categories?sort=name_fr
GET  /items/additives/{id}
POST /items/products
POST /items/contributions
POST /items/scans
PATCH /items/users/me
```

### Endpoints custom — Extension `bayen-api`

#### `POST /custom/scan`

Orchestration complète Chemin A.

Request :
```typescript
{
  barcode: string,
  session_id: string,
  user_id?: string
}
```

Response — trouvé :
```typescript
{
  found: true,
  source: "database" | "open_food_facts",
  product: Product,
  score: {
    total: number,
    label: string,
    nutriscore_grade: string,
    nova_group: number,
    nutriscore_points: number,
    nova_points: number,
    additives_points: number,
    additives_detail: AdditiveResult[],
    incomplete: boolean
  }
}
```

Response — non trouvé :
```typescript
{
  found: false,
  barcode: string,
  message: "Ce produit n'est pas encore dans notre base.",
  contribute_url: "/contribuer?barcode=XXXXX"
}
```

Logique interne :
1. Query Directus (barcode + status=published)
2. Trouvé → scorer → incrémenter scan_count → log → retourner
3. Non trouvé → fetch Open Food Facts
4. Trouvé OFF → importer (data_source=off, status=published) → scorer → retourner
5. Non trouvé nulle part → retourner `found: false`

#### `POST /custom/ocr-score`

Traitement Chemin B. Multipart/form-data.

Request :
```typescript
{
  barcode: string,
  image_nutrition: File,
  image_ingredients?: File,
  image_front?: File,
  user_id?: string
}
```

Response :
```typescript
{
  job_status: "done" | "low_confidence" | "manual_required",
  ocr_confidence: number,
  product_draft?: Product,
  score?: ScoreResult,
  message?: string
}
```

#### `GET /custom/search`

```
GET /custom/search?q=bimo+chocolat&category=biscuits&limit=20&offset=0
```

---

## 9. Frontend PWA

### Pages Astro

```
/                         Home — scan + produits récents + stats
/scan                     Interface caméra scan
/produit/[barcode]        Fiche produit complète (SSR)
/recherche                Recherche textuelle
/contribuer               Formulaire ajout produit
/contribuer/[barcode]     Formulaire pré-rempli
/categories/[slug]        Liste produits par catégorie (SSG)
/additifs                 Base additifs E-xxx (SSG)
/additifs/[id]            Fiche additive (SSG)
/compte                   Dashboard utilisateur
/connexion                Login Directus
```

### Composants React clés

**`<BarcodeScanner />`**
- Bibliothèque : `@zxing/library`
- Détection EAN-13 et EAN-8
- Overlay avec ligne de scan animée
- Fallback : input texte manuel
- Vibration haptic sur scan réussi

**`<ScoreDisplay />`**
- Cercle animé 0–100, coloré selon niveau
- Barre Nutri-Score A→E
- Pastilles NOVA 1→4
- Liste additifs avec badge risque
- Points positifs / négatifs
- Badge "Non vérifié" si confidence_score < 0.8

Couleurs :
- 75–100 : `#16a34a`
- 50–74 : `#84cc16`
- 25–49 : `#f97316`
- 0–24 : `#ef4444`

**`<ProductForm />`** — multi-étapes contribution :
1. Code-barres (pré-rempli, validation EAN)
2. Photos avec guide cadrage + crop/rotate
3. Progress bar OCR + parsing en cours
4. Vérification données extraites (correction possible)
5. Confirmation et soumission

**`<ContributeButton />`** — bouton flottant si produit incomplet ou pending_review.

### PWA Manifest

```json
{
  "name": "Bayen — بَيَّن",
  "short_name": "Bayen",
  "description": "Notation participative des produits alimentaires au Maroc",
  "start_url": "/scan",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#16a34a",
  "background_color": "#ffffff",
  "lang": "fr",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker (Workbox)

- Pages shell : CacheFirst
- API produits : NetworkFirst, fallback cache 24h
- Images R2/CDN : CacheFirst, max 500 entrées, expiry 7 jours
- Offline : 20 derniers produits scannés depuis IndexedDB

### i18n

- Langue par défaut : français
- Arabe RTL : phase 2 — structure i18n Astro en place dès le départ

---

## 10. Système de contribution communautaire

### Flux

```
Utilisateur soumet produit / correction
    ↓
status: pending_review + confidence_score calculé
    ↓
n8n → email modérateur (lien Directus admin direct)
    ↓
Si utilisateur "Vérifié" → auto-approve → skip email
    ↓
Modérateur : approve / reject + raison
    ↓
n8n → notification utilisateur + attribution points
```

### Points

| Action | Points |
|--------|--------|
| Ajouter un produit complet | 50 pts |
| Ajouter photos manquantes | 20 pts |
| Corriger des données (approuvée) | 15 pts |
| Scanner un produit existant | 1 pt |
| Contribution confirmée par 3 utilisateurs | +10 pts bonus |

### Niveaux

| Niveau | Seuil | Avantage |
|--------|-------|----------|
| Nouveau | 0 pts | — |
| Contributeur | 100 pts | Bouton "Confirmer" actif |
| Expert | 500 pts | Badge profil |
| Vérifié | 2000 pts + validation manuelle | Auto-approve |

### Validation communautaire

Boutons "Confirmer ✓" et "Signaler une erreur ⚠️" sur chaque fiche.
3 confirmations Contributeur+ → `confidence_score += 0.1` (max 1.0).

---

## 11. Algorithme de scoring

Le score (0–100) est **entièrement déterministe**. Le LLM ne calcule jamais le chiffre final.

### Formule

```
Score = Nutri-Score (50 pts max) + NOVA (30 pts max) + Additifs (20 pts max)
```

### A. Nutri-Score → 0 à 50 points

Calcul méthode FSA officielle : points négatifs A − points positifs C.

**Points négatifs A (pour 100g) :**

| Nutriment | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|-----------|---|---|---|---|---|---|---|---|---|---|
| Énergie kcal | ≤80 | ≤160 | ≤240 | ≤320 | ≤400 | ≤480 | ≤560 | ≤640 | ≤720 | >720 |
| AGS g | ≤1 | ≤2 | ≤3 | ≤4 | ≤5 | ≤6 | ≤7 | ≤8 | ≤9 | >9 |
| Sucres g | ≤4.5 | ≤9 | ≤13.5 | ≤18 | ≤22.5 | ≤27 | ≤31 | ≤36 | ≤40 | >40 |
| Sel g | ≤0.3 | ≤0.6 | ≤0.9 | ≤1.2 | ≤1.5 | ≤1.8 | ≤2.1 | ≤2.4 | ≤2.7 | >2.7 |

**Points positifs C :** fibres, protéines, fruits/légumes/noix.

**Score FSA :**
- Si A < 11 : FSA = A − C
- Si A ≥ 11 et fruits/légumes < 5 pts : FSA = A − (fibres + fruits)

**Conversion → points Bayen :**

| Grade | Seuil FSA | Points |
|-------|-----------|--------|
| A | ≤ −1 | 50 |
| B | 0–2 | 40 |
| C | 3–10 | 30 |
| D | 11–18 | 15 |
| E | ≥ 19 | 0 |

### B. NOVA → 0 à 30 points

| Groupe | Description | Points |
|--------|-------------|--------|
| 1 | Non transformé / minimalement transformé | 30 |
| 2 | Ingrédients culinaires transformés | 20 |
| 3 | Aliments transformés | 10 |
| 4 | Ultra-transformés | 0 |

Détection par règles (fallback si LLM indisponible) :
- NOVA 4 si : arômes artificiels, colorants artificiels, émulsifiants E4xx, sirop de glucose-fructose, protéines hydrolysées, maltodextrine
- NOVA 3 si : sel + sucre + huile ajoutés + transformation industrielle
- NOVA 1–2 : produits bruts ou ingrédients simples

### C. Additifs → 0 à 20 points

Score départ : 20 pts. Déductions :

| Niveau risque | Déduction |
|---------------|-----------|
| safe | 0 pts |
| limited | −2 pts par additif |
| avoid | −5 pts par additif |
| banned_ma | −10 pts par additif |

Plancher à 0.

### Labels

| Score | Label | Couleur |
|-------|-------|---------|
| 75–100 | Excellent | `#16a34a` |
| 50–74 | Bon | `#84cc16` |
| 25–49 | Médiocre | `#f97316` |
| 0–24 | Mauvais | `#ef4444` |

### Données manquantes

Score partiel calculé, flag `incomplete: true`, badge "Score incomplet" affiché, invitation à contribuer.

---

## 12. Flows n8n

### Flow 1 — Import Open Food Facts

Déclencheur : webhook depuis extension Directus (barcode non trouvé)

1. `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
2. Si trouvé : mapper champs → `POST /items/products` (`data_source: "off"`, `status: "published"`)
3. Répondre au webhook avec les données importées

### Flow 2 — Modération contributions

Déclencheur : création `contribution` avec `status: "pending"`

1. Récupérer contribution + utilisateur
2. Si rank = "vérifié" → auto-approve → `PATCH /items/products/{id}` status=published → fin
3. Sinon → email modérateur avec lien Directus admin + résumé

### Flow 3 — Notifications post-review

Déclencheur : `contribution.status` change vers approved / rejected

1. Email contributeur (félicitations ou raison du rejet)
2. Si approuvé : `PATCH /items/directus_users/{id}` points += X, contributions_count += 1
3. Mise à jour rank si seuil atteint

### Flow 4 — Sync OFF quotidienne (phase 2)

Déclencheur : cron 3h du matin

1. Produits avec `data_source: "off"` et `date_updated` > 30 jours
2. Re-fetch OFF API → update si données changées

---

## 13. Sécurité et modération

### Auth

- Login email + mot de passe via Directus
- JWT : access 15min, refresh 7 jours
- Rate limiting Cloudflare : 60 req/min sur `/custom/scan`, 10 req/min sur `/custom/ocr-score`

### Anti-spam

- Max 3 nouveaux produits par heure par compte
- hCaptcha sur le formulaire contribution
- Suspension temporaire après 5 contributions rejetées en 24h

### Modération

- Toutes contributions → `status: pending_review` par défaut
- Photos vérifiées manuellement
- OCR → `confidence_score < 1` → badge "Non vérifié"
- Bouton "Signaler une erreur" → flow n8n

### Données personnelles

- Scans anonymes (session_id) si non connecté
- Pas de tracking tiers, pas de cookies publicitaires
- Aucun transfert hors Maroc/EU
- Politique de confidentialité FR + AR au lancement

---

## 14. SEO et performance

### Rendu

- `/produit/[barcode]` : SSR
- `/categories/[slug]`, `/additifs/[id]`, `/additifs` : SSG

### Meta tags page produit

```html
<title>{name_fr} ({brand}) — Score {score}/100 | Bayen بَيَّن</title>
<meta name="description" content="{name_fr} de {brand} : score {score}/100, Nutri-Score {grade}, NOVA {nova}. {n} additifs détectés.">
<meta property="og:image" content="{cdn_url}/{image_front}">
<link rel="canonical" href="https://bayen.ma/produit/{barcode}">
```

### Schema.org

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "brand": { "@type": "Brand", "name": "..." },
  "nutrition": {
    "@type": "NutritionInformation",
    "calories": "...", "fatContent": "...", "sugarContent": "..."
  }
}
```

### Cibles Core Web Vitals

| Métrique | Cible |
|----------|-------|
| LCP | < 1.5s |
| CLS | < 0.1 |
| INP | < 100ms |

---

## 15. Monétisation phase 2

**Phase 2A — Premium utilisateur** (5–9 MAD/mois)
- Historique complet des scans
- Listes de courses avec score moyen
- Alertes si données produit mises à jour
- Export PDF

**Phase 2B — Dashboard marques** (500–2000 MAD/mois)
- Score de leurs produits + raisons
- Suggestions amélioration formulation
- Badge "Certifié Bayen" si score ≥ 70

**Phase 2C — API publique**
- Gratuit jusqu'à 1000 appels/mois
- 0.01 MAD/appel au-delà
- Via Cloudflare Workers + API key management

---

## 16. Roadmap et phases

### Phase 0 — Setup (Semaine 1)

- [ ] Repo GitHub `bayen`
- [ ] `docker-compose.yml` : Directus + PostgreSQL + Ollama + Tesseract
- [ ] Cloudflare Tunnel → `api.bayen.ma`
- [ ] Bucket R2 `bayen-products` + domaine `cdn.bayen.ma`
- [ ] Schéma Directus — toutes les collections
- [ ] Seed base additifs E-xxx complète
- [ ] `docker exec -it bayen-ollama ollama pull mistral:7b`
- [ ] Test Tesseract : `curl -F "image=@test.jpg" http://localhost:5001/ocr`

### Phase 1 — MVP Chemin A (Semaines 2–4)

- [ ] Extension Directus : `/custom/scan`
- [ ] Intégration Open Food Facts API
- [ ] Algorithme scoring TypeScript
- [ ] Frontend : `/`, `/scan`, `/produit/[barcode]`
- [ ] `<BarcodeScanner />` (zxing)
- [ ] `<ScoreDisplay />`
- [ ] Déploiement Cloudflare Pages

### Phase 2 — Contribution Chemin B (Semaines 5–6)

- [ ] Extension Directus : `/custom/ocr-score`
- [ ] Intégration Tesseract API
- [ ] Intégration Mistral:7b parsing
- [ ] `<ProductForm />` multi-étapes
- [ ] Guide photo dans l'UI
- [ ] Système points + niveaux
- [ ] Flows n8n modération + notifications

### Phase 3 — PWA et polish (Semaines 7–8)

- [ ] Service Worker Workbox + manifest
- [ ] Pages `/additifs`, `/categories`, `/recherche`, `/compte`
- [ ] SEO complet

### Phase 4 — Lancement (Semaine 9)

- [ ] Beta fermée 20 utilisateurs Casablanca
- [ ] Seed initiale 500 produits marocains (Bimo, Centrale Laitière, Koutoubia, Doha, Sidi Ali…)
- [ ] Communication N0.ma
- [ ] Soumission Google Play (TWA)

---

## 17. Variables d'environnement

```bash
# .env — jamais commité. Copier .env.example et remplir.

APP_NAME=Bayen
APP_URL=https://bayen.ma

# Directus
DIRECTUS_URL=https://api.bayen.ma
DIRECTUS_ADMIN_EMAIL=admin@n0.ma
DIRECTUS_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DIRECTUS_SECRET=RANDOM_64_CHARS_HEX

# PostgreSQL
POSTGRES_HOST=bayen-postgres
POSTGRES_PORT=5432
POSTGRES_DB=bayen
POSTGRES_USER=bayen_user
POSTGRES_PASSWORD=CHANGE_ME

# Cloudflare R2
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=bayen-products
R2_ACCESS_KEY_ID=YOUR_R2_KEY
R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET
R2_PUBLIC_URL=https://cdn.bayen.ma

# Ollama — GPU M4000, mistral:7b uniquement
OLLAMA_URL=http://bayen-ollama:11434
OLLAMA_MODEL_PARSING=mistral:7b
OLLAMA_TIMEOUT_MS=30000
OLLAMA_KEEP_ALIVE=5m

# Tesseract — CPU, container interne
TESSERACT_URL=http://bayen-tesseract:5000
TESSERACT_DEFAULT_LANG=fra+ara
TESSERACT_MIN_CONFIDENCE=50

# Open Food Facts
OFF_API_URL=https://world.openfoodfacts.org/api/v2
OFF_USER_AGENT=Bayen/1.0 (contact@n0.ma)

# n8n
N8N_WEBHOOK_BASE=http://n8n:5678/webhook

# hCaptcha
HCAPTCHA_SITE_KEY=YOUR_SITE_KEY
HCAPTCHA_SECRET_KEY=YOUR_SECRET_KEY

# Frontend (variables publiques)
PUBLIC_DIRECTUS_URL=https://api.bayen.ma
PUBLIC_SITE_URL=https://bayen.ma
PUBLIC_CDN_URL=https://cdn.bayen.ma
PUBLIC_HCAPTCHA_SITE_KEY=YOUR_SITE_KEY
PUBLIC_APP_NAME=Bayen
```

---

## 18. Structure du repo

```
bayen/
├── CLAUDE.md
├── SPEC.md
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── tesseract-api/
│   ├── Dockerfile
│   ├── app.py
│   └── requirements.txt
│
├── frontend/
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── tsconfig.json
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   ├── sw.js
│   │   └── icons/
│   └── src/
│       ├── pages/
│       │   ├── index.astro
│       │   ├── scan.astro
│       │   ├── produit/[barcode].astro
│       │   ├── recherche.astro
│       │   ├── contribuer/
│       │   │   ├── index.astro
│       │   │   └── [barcode].astro
│       │   ├── categories/[slug].astro
│       │   ├── additifs/
│       │   │   ├── index.astro
│       │   │   └── [id].astro
│       │   └── compte.astro
│       ├── components/
│       │   ├── BarcodeScanner.tsx
│       │   ├── ScoreDisplay.tsx
│       │   ├── ProductCard.tsx
│       │   ├── ProductForm.tsx
│       │   ├── AdditiveTag.tsx
│       │   └── NutriScoreBar.tsx
│       ├── lib/
│       │   ├── directus.ts
│       │   ├── scoring.ts
│       │   ├── off.ts
│       │   ├── ollama.ts
│       │   ├── tesseract.ts
│       │   └── types.ts
│       └── layouts/
│           └── Layout.astro
│
├── directus/
│   ├── extensions/
│   │   └── bayen-api/
│   │       ├── package.json
│   │       └── src/
│   │           ├── index.ts
│   │           ├── scan.ts
│   │           ├── ocr-score.ts
│   │           ├── search.ts
│   │           └── scoring.ts
│   └── snapshots/
│       └── 20260325-initial.yaml
│
├── scripts/
│   ├── seed-additives.ts
│   ├── seed-categories.ts
│   └── import-off-sample.ts
│
└── n8n/
    └── workflows/
        ├── import-off.json
        ├── moderation.json
        └── notifications.json
```
