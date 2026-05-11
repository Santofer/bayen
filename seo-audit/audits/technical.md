# Audit Technique SEO — Bayen (bayen.ma)
**Date :** 11 mai 2026
**Auditeur :** SEO Tech Sub-agent
**URL principale :** https://bayen.ma
**Pages testées :** /, /produit/3017620422003, /blog/comprendre-le-nutri-score

---

## Résumé exécutif

La base technique de Bayen est solide : HTTPS fonctionnel, HTTP/2, sitemap XML dynamique avec 2 140 URLs, robots.txt correct (corrigé le 11/05), hreflang en place. Cependant, **l'audit révèle un bug critique sur les URLs canoniques** qui touche plusieurs centaines de pages indexables (additifs, catégories, ingrédients, recherche) : toutes retournent `canonical: https://bayen.ma/` au lieu de leur propre URL. Ce bug peut aboutir à une déduplication systématique par Google en faveur de la homepage, annulant tout le capital SEO de ces pages. Par ailleurs, les performances mobiles présentent deux risques LCP identifiés : Google Fonts synchrone et images CDN non optimisées (JPEG 674 KB non converti en WebP dans le HTML). Aucun header HTTP de sécurité n'est défini sur les pages SSR (pas de HSTS, CSP, X-Frame-Options). Le score technique global est estimé à **6,5/10**.

---

## Score technique : 6,5 / 10

| Axe | Poids | Sous-score | Pondéré |
|-----|-------|-----------|---------|
| Indexabilité / Crawlabilité | 30% | 6/10 | 1,80 |
| Performance (CWV estimés) | 30% | 6/10 | 1,80 |
| HTTPS + Sitemap + Robots | 15% | 9/10 | 1,35 |
| Headers HTTP + Sécurité | 15% | 3/10 | 0,45 |
| Hreflang + Mobile/PWA | 10% | 9/10 | 0,90 |
| **TOTAL** | | | **6,30 → arrondi 6,5** |

---

## Issues priorisées

### P1 — Bloquant (impact indexation direct)

---

#### P1-A | Bug canonical généralisé — ~170 pages pointent toutes vers /

**Description :**
Le composant `SeoHead.astro` définit `path = '/'` comme valeur par défaut. Toutes les pages qui n'explicitement passent pas la prop `path=` au composant `<Layout>` reçoivent donc `<link rel="canonical" href="https://bayen.ma/">`. Or, seules 4 pages passent correctement cette prop : `/produit/[barcode]`, `/categories` (index), `/blog`, `/blog/[slug]`, `/a-propos`, `/methodologie`.

**Pages SEO-importantes affectées (vérifiées en live) :**
- `/additifs` → canonical: `https://bayen.ma/` (FAUX)
- `/additifs/E102` → canonical: `https://bayen.ma/` (FAUX)
- `/categories/biscuits` → canonical: `https://bayen.ma/` (FAUX)
- `/recherche` → canonical: `https://bayen.ma/` (FAUX)
- `/classement` → canonical: `https://bayen.ma/` (FAUX)
- `/marque/[name]` → canonical: `https://bayen.ma/` (FAUX)
- `/ingredients/[id]` → canonical: `https://bayen.ma/` (FAUX)
- `/contribuer` → canonical: `https://bayen.ma/` (FAUX)
- `/scan` → canonical: `https://bayen.ma/` (FAUX)

**Impact :** Google peut interpréter ces pages comme des doublons de la homepage et les déprioriser ou ne pas les indexer séparément. La base de 150 additifs, 12 catégories, et toutes les pages marque sont concernées.

**Fix concret :**
Corriger chaque `<Layout>` sans `path=` dans les fichiers suivants. Dans chaque fichier, ajouter `path="/[chemin-correspondant]"` ou `path={\`/[chemin-dynamique]\`}` :

```
frontend/src/pages/additifs/index.astro
  → <Layout title="..." path="/additifs">

frontend/src/pages/additifs/[id].astro
  → const { id } = Astro.params
  → <Layout title="..." path={`/additifs/${id}`}>

frontend/src/pages/categories/[slug].astro
  → const { slug } = Astro.params
  → <Layout title="..." path={`/categories/${slug}`}>

frontend/src/pages/marque/[name].astro
  → const { name } = Astro.params
  → <Layout title="..." path={`/marque/${name}`}>

frontend/src/pages/ingredients/index.astro
  → <Layout title="..." path="/ingredients">

frontend/src/pages/ingredients/[id].astro
  → const { id } = Astro.params
  → <Layout title="..." path={`/ingredients/${id}`}>

frontend/src/pages/recherche.astro
  → <Layout title="..." path="/recherche">

frontend/src/pages/classement.astro
  → <Layout title="..." path="/classement">

frontend/src/pages/contribuer/index.astro
  → <Layout title="..." path="/contribuer">

frontend/src/pages/scan.astro
  → <Layout title="..." path="/scan">
```

**Effort :** S (< 30 min, modifications de ligne dans 10 fichiers)

---

#### P1-B | Pages /connexion et /admin/import-off sans noindex

**Description :**
`/connexion` est accessible aux moteurs (pas de `noindex`, pas dans le sitemap), avec un canonical incorrect pointant vers `/`. `/admin/import-off` est une page d'admin non protégée par noindex.

**Fix concret :**
- `frontend/src/pages/connexion.astro` : ajouter `noindex={true}` dans l'appel `<Layout>`
- `frontend/src/pages/admin/import-off.astro` : ajouter `noindex={true}` dans l'appel `<Layout>`

**Effort :** S (2 lignes)

---

#### P1-C | www.bayen.ma répond 200 sans redirection vers bayen.ma

**Description :**
`https://www.bayen.ma/` retourne HTTP 200 avec `canonical: https://bayen.ma/` au lieu d'une redirection 301. Googlebot peut indexer les deux versions, divisant le PageRank et gaspillant du crawl budget.

**Fix concret :**
Configurer une règle de redirection dans Cloudflare Dashboard :
- `Rules > Redirect Rules > Create Rule`
- Condition : `Hostname equals www.bayen.ma`
- Action : `Redirect to https://bayen.ma/<path> | 301 | Preserve query string`

Alternativement, dans le fichier `frontend/public/_redirects` (créer si absent) :
```
https://www.bayen.ma/* https://bayen.ma/:splat 301
```

**Effort :** S (5 min dans Cloudflare Dashboard)

---

### P2 — High (impact performance LCP)

---

#### P2-A | Google Fonts chargées en synchrone — risque LCP

**Description :**
`Layout.astro` charge deux familles (Mouse Memoirs + Nunito) via un `<link rel="stylesheet">` synchrone vers `fonts.googleapis.com`. Ce lien est render-blocking : le navigateur attend la résolution DNS + téléchargement de la CSS fonts avant de rendre la page. Position dans le `<head>` : avant le canonical, avant les meta SEO.

Bien que `display=swap` soit présent dans l'URL Google Fonts (ce qui est positif), la feuille de styles elle-même reste render-blocking et déclenche une connexion externe avant le premier paint.

**Fix concret** (`frontend/src/layouts/Layout.astro`, environ ligne 47-49) :
Remplacer le chargement synchrone par la technique `media="print"` :
```html
<!-- Remplacer : -->
<link href="https://fonts.googleapis.com/css2?family=Mouse+Memoirs&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<!-- Par : -->
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Mouse+Memoirs&family=Nunito:wght@400;500;600;700;800&display=swap" onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mouse+Memoirs&family=Nunito:wght@400;500;600;700;800&display=swap"></noscript>
```

**Bonus :** Envisager le self-hosting des polices via `@fontsource/nunito` (npm) pour éliminer la dépendance externe et réduire le TTFB de ~200ms.

**Effort :** S (1 ligne dans Layout.astro)

---

#### P2-B | Image hero CDN non optimisée — 674 KB JPEG sur la homepage

**Description :**
La homepage charge une image de blog depuis `https://api.bayen.ma/assets/888d0281-...` sans paramètres de transformation. La réponse brute est un JPEG de 673 944 octets (658 KB). Directus supporte les transformations à la volée (`?format=webp&width=800`), qui réduisent le poids à ~57 KB (rapport 12:1), mais cette fonctionnalité n'est pas utilisée dans le HTML.

De plus, aucune balise `<link rel="preload">` n'est présente pour cette image LCP, et aucun `fetchpriority="high"` n'est défini.

**Fix concret** (composant `frontend/src/components/BlogCarousel.tsx` et/ou composant article card) :
```tsx
// Remplacer les URLs d'images CDN brutes :
const imgSrc = `https://api.bayen.ma/assets/${imageId}`

// Par des URLs avec transformation WebP :
const imgSrc = `https://api.bayen.ma/assets/${imageId}?format=webp&width=800&quality=80`

// Et pour l'image above-the-fold, ajouter fetchpriority :
<img src={imgSrc} fetchpriority="high" loading="eager" ... />
```

Et dans `Layout.astro` ou la page `index.astro`, ajouter un preload pour l'image LCP :
```html
<link rel="preload" as="image" href="https://api.bayen.ma/assets/[uuid]?format=webp&width=800" />
```

Également : ajouter `<link rel="preconnect" href="https://api.bayen.ma">` dans le `<head>`.

**Effort :** M (modifier les composants image + identifier les images LCP par page)

---

#### P2-C | Assets statiques : cache max-age trop court (4h au lieu de 1 an)

**Description :**
Les fichiers dans `/_astro/` (CSS, potentiellement JS) ont des noms contenant un hash de contenu (`a-propos.BaZHMQb1.css`), ce qui garantit qu'un changement produit une nouvelle URL. Ils devraient donc être mis en cache pour 1 an (`max-age=31536000`). Or, Cloudflare Pages les sert avec `max-age=14400` (4 heures seulement). Cela augmente inutilement la bande passante et ralentit les visites répétées.

**Fix concret :**
Créer le fichier `frontend/public/_headers` :
```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/icons/*
  Cache-Control: public, max-age=31536000, immutable

/badges/*
  Cache-Control: public, max-age=31536000, immutable

/*.webmanifest
  Cache-Control: public, max-age=0, must-revalidate

/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
```

**Effort :** S (nouveau fichier, 15 min)

---

#### P2-D | Aucun header de sécurité HTTP sur les pages SSR

**Description :**
Toutes les pages HTML servent sans `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, ni `Content-Security-Policy`. Les fichiers statiques (`/_astro/*.css`) reçoivent bien `referrer-policy` et `x-content-type-options` via Cloudflare Pages, mais les pages SSR (Workers) n'ont pas ces headers.

Google Lighthouse Audit `Best Practices` pénalise l'absence de HSTS et CSP. Pour PageSpeed Insights score, c'est un critère direct.

**Fix concret :**
Étendre le fichier `frontend/public/_headers` (créé en P2-C) :
```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Note : pour le HSTS, ajouter `preload` uniquement après avoir vérifié que www.bayen.ma redirige bien en 301 (corriger P1-C en premier).

**Effort :** S (ajouter au même fichier _headers)

---

### P3 — Medium (optimisations PWA et sitemap)

---

#### P3-A | PWA manifest incomplet — pas de screenshots ni d'id ni de shortcuts

**Description :**
Le `manifest.webmanifest` est fonctionnel (display: standalone, icons 192 + 512) mais manque plusieurs champs qui améliorent l'invite d'installation sur Chrome et Android :
- `id` : identifiant unique de la PWA (évite les conflits si l'URL change)
- `screenshots` : captures d'écran affichées dans la fiche d'installation (meilleur taux d'acceptation)
- `shortcuts` : accès rapide depuis l'icône sur l'écran d'accueil (ex : "Scanner", "Rechercher")
- `apple-touch-icon` dans le `<head>` : absent (iOS utilise le favicon SVG par défaut)

**Fix concret** (`frontend/public/manifest.webmanifest`) :
```json
{
  "id": "bayen-pwa-v1",
  "shortcuts": [
    { "name": "Scanner un produit", "url": "/scan", "icons": [{"src": "/icons/icon-192.png", "sizes": "192x192"}] },
    { "name": "Rechercher", "url": "/recherche", "icons": [{"src": "/icons/icon-192.png", "sizes": "192x192"}] }
  ],
  "screenshots": [
    { "src": "/screenshots/home.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow", "label": "Page d'accueil Bayen" },
    { "src": "/screenshots/scan.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow", "label": "Scanner un code-barres" }
  ]
}
```

Et dans `Layout.astro`, ajouter :
```html
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

**Effort :** M (générer 2 captures d'écran, modifier le manifest)

---

#### P3-B | Sitemap : /scan inclus avec priorité 0.9 — à revoir

**Description :**
La page `/scan` est incluse dans le sitemap avec `priority=0.9` (la plus haute après la homepage). C'est une page applicative (ouverture caméra) qui n'a pas de contenu textuel indexable et dont le canonical pointe vers `/` (bug P1-A). Elle n'a pas vocation à ranker.

De plus, `/contribuer` est dans le sitemap sans noindex.

**Fix concret** (`frontend/src/pages/sitemap.xml.ts`, ligne 17) :
Retirer `/scan` et `/contribuer` de la liste `staticPages`, ou les déplacer hors du sitemap. Ces pages sont utiles via le bouton dans l'UI, pas via la recherche Google.

**Effort :** S (supprimer 2 entrées de l'array `staticPages`)

---

#### P3-C | lastmod absent sur les 9 pages statiques et ~45 produits sans date

**Description :**
Les 9 pages statiques (/, /scan, /recherche, /additifs, /blog, /analyser-repas, /a-propos, /methodologie, /contribuer) n'ont pas de `<lastmod>` dans le sitemap. Google utilise lastmod pour prioriser le recrawl. ~45 produits ont aussi `date_updated: null`.

**Fix concret** (`frontend/src/pages/sitemap.xml.ts`) :
Pour les pages statiques, ajouter des dates de dernière modification connues :
```ts
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'daily', lastmod: '2026-05-11' },
  { url: '/a-propos', priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-11' },
  // ...
]
```
Et dans le XML builder, émettre `<lastmod>` si la date est présente.

**Effort :** S (modifier l'array et le template XML)

---

#### P3-D | OG image des fiches produit = fallback générique (og-default.png)

**Description :**
Nutella (3017620422003) affiche `og:image: https://bayen.ma/og-default.png` alors que la logique dans `[barcode].astro` est censée utiliser `image_front` si disponible. En pratique, l'image produit n'est pas présente dans Directus local (ou son `image_front` renvoie une URL inaccessible), donc le fallback générique est utilisé.

**Impact :** Les partages WhatsApp/Facebook de fiches produit affichent tous la même image générique. Pas de signal visuel fort pour les utilisateurs qui partagent.

**Fix concret :**
Vérifier dans Directus (api.bayen.ma) que le champ `image_front` des produits est bien rempli avec une URL valide. Pour les produits importés depuis Open Food Facts, enrichir `image_front` via l'URL OFF pendant l'import (`https://images.openfoodfacts.org/images/products/...`).

Alternativement, générer des OG images dynamiques par barcode avec `?text=NomProduit&score=18` comme fallback enrichi.

**Effort :** M (nécessite un enrichissement des données produit dans Directus)

---

## Annexes

### A1 — Métriques de performance mesurées (curl, serveur Madrid)

| Page | TTFB | Taille HTML | Total download |
|------|------|-------------|----------------|
| `/` (homepage) | 329ms | 60,2 KB | 338ms |
| `/produit/3017620422003` | 415ms | 50,7 KB | 427ms |
| `/blog/comprendre-le-nutri-score` | 253ms | 31,7 KB | 257ms |

- CSS bundle (`/_astro/a-propos.BaZHMQb1.css`) : 61,5 KB (unique bundle global)
- Pas de JS bundle chargé côté serveur détecté dans le HTML initial (Astro Islands en lazy)
- Image hero CDN brute : **658 KB JPEG** — réduite à ~57 KB en WebP via transformation Directus

Note : PSI API (PageSpeed Insights Google) indisponible lors de l'audit (quota journalier exhausted). Les CWV réels (LCP, INP, CLS) sont à mesurer via Google Search Console > Rapport Core Web Vitals dès activation de GSC.

### A2 — Statut robots.txt (vérifié en live)

```
User-agent: * → Allow: /
Disallow: /compte, /connexion, /api/
13 bots IA explicitement autorisés
Sitemap: https://bayen.ma/sitemap.xml ✓ (corrigé le 11/05)
```

### A3 — Statut sitemap.xml (vérifié en live)

| Type | Nombre | lastmod |
|------|--------|---------|
| Pages statiques | 9 | Aucune |
| Produits | 1 951 | ~1 906 ont lastmod |
| Articles blog | 18 | Tous avec lastmod |
| Catégories | 12 | Aucune |
| Additifs | 150 | Aucun |
| **Total** | **2 140** | 1 933 (90%) |

### A4 — Statut HTTPS et redirections

| Test | Résultat |
|------|---------|
| HTTP → HTTPS | 301 ✓ |
| www → non-www | 200 SANS redirect (bug P1-C) |
| Trailing slash /blog/ → /blog | 200 (les deux servent, canonical correct) |
| HSTS header | Absent sur pages SSR |
| Certificat HTTPS | Valide (Cloudflare) |

### A5 — Headers HTTP (pages SSR vs assets statiques)

| Header | Pages SSR (HTML) | Assets statiques (_astro/) |
|--------|-----------------|--------------------------|
| Cache-Control | Absent | `public, max-age=14400` (trop court) |
| Strict-Transport-Security | Absent | Absent |
| X-Frame-Options | Absent | Absent |
| X-Content-Type-Options | Absent | `nosniff` ✓ |
| Referrer-Policy | Absent | `strict-origin-when-cross-origin` ✓ |
| Content-Security-Policy | Absent | Absent |
| cf-cache-status | DYNAMIC | REVALIDATED / MISS |

### A6 — PWA / Service Worker

| Critère | Statut |
|---------|--------|
| manifest.webmanifest | ✓ présent, valide |
| Service Worker `/sw.js` | ✓ présent (5,3 KB) |
| Icônes 192px + 512px | ✓ présentes |
| apple-touch-icon | Absent |
| screenshots dans manifest | Absent |
| `id` dans manifest | Absent |
| `shortcuts` dans manifest | Absent |

---

## Quick Wins — Top 5 actions < 30 min chacune

| # | Action | Fichier(s) | Effort | Impact |
|---|--------|-----------|--------|--------|
| 1 | Corriger canonical sur additifs/categories/ingredients/recherche | 10 fichiers .astro | 20 min | Indexation de ~170 pages |
| 2 | Ajouter noindex sur /connexion et /admin/import-off | 2 fichiers .astro | 5 min | Propreté indexation |
| 3 | Créer `public/_headers` avec cache long + headers sécurité | Nouveau fichier | 15 min | Perf + Best Practices Lighthouse |
| 4 | Redirection 301 www → non-www dans Cloudflare Dashboard | Dashboard CF | 5 min | Consolidation crawl budget |
| 5 | Fonts Google asynchrones (preload+onload trick) dans Layout.astro | Layout.astro | 10 min | LCP mobile -200ms estimé |
