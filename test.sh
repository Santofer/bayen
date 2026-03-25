#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Bayen — Script de test infrastructure + API
#
# Usage :
#   chmod +x test.sh && ./test.sh
#
# Prérequis :
#   - Docker + Docker Compose
#   - GPU NVIDIA avec nvidia-container-toolkit (pour Ollama)
#   - curl, jq
# ──────────────────────────────────────────────────────────────

set -euo pipefail

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

pass() { echo -e "  ${GREEN}✅ $1${NC}"; ((PASS++)); }
fail() { echo -e "  ${RED}❌ $1${NC}"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}⏭️  $1${NC}"; ((SKIP++)); }
info() { echo -e "${CYAN}$1${NC}"; }
header() { echo -e "\n${BOLD}═══ $1 ═══${NC}"; }

# Vérifier les prérequis
for cmd in docker curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}Erreur : '$cmd' est requis mais n'est pas installé.${NC}"
    exit 1
  fi
done

# ──────────────────────────────────────────────────────────────
# 1. Docker Compose — démarrage des containers
# ──────────────────────────────────────────────────────────────
header "1/6 — Docker Compose up"

info "Démarrage des containers..."
if docker compose up -d 2>&1; then
  pass "docker compose up -d exécuté"
else
  fail "docker compose up -d a échoué"
  echo -e "${RED}Impossible de continuer sans les containers.${NC}"
  exit 1
fi

# Attendre un peu que les containers démarrent
info "Attente du démarrage des containers (10s)..."
sleep 10

# Vérifier que les 4 containers sont running
EXPECTED_CONTAINERS=("bayen-postgres" "bayen-directus" "bayen-ollama" "bayen-tesseract")

for container in "${EXPECTED_CONTAINERS[@]}"; do
  STATUS=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
  if [ "$STATUS" = "running" ]; then
    pass "$container est running"
  else
    fail "$container n'est PAS running (status: $STATUS)"
  fi
done

# ──────────────────────────────────────────────────────────────
# 2. Health check Tesseract
# ──────────────────────────────────────────────────────────────
header "2/6 — Tesseract OCR health check"

# Attendre que le serveur Flask soit prêt (max 30s)
TESSERACT_URL="http://localhost:5001/health"
TESSERACT_READY=false

for i in $(seq 1 15); do
  if curl -sf "$TESSERACT_URL" -o /dev/null 2>/dev/null; then
    TESSERACT_READY=true
    break
  fi
  sleep 2
done

if $TESSERACT_READY; then
  RESPONSE=$(curl -sf "$TESSERACT_URL" 2>/dev/null)
  STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
  VERSION=$(echo "$RESPONSE" | jq -r '.tesseract_version' 2>/dev/null)

  if [ "$STATUS" = "ok" ]; then
    pass "Tesseract health OK (version: $VERSION)"
  else
    fail "Tesseract a répondu mais status != ok : $RESPONSE"
  fi
else
  fail "Tesseract ne répond pas sur $TESSERACT_URL après 30s"
  info "Logs du container :"
  docker logs --tail 20 bayen-tesseract 2>&1 | head -10
fi

# ──────────────────────────────────────────────────────────────
# 3. Ollama — vérification du service
# ──────────────────────────────────────────────────────────────
header "3/6 — Ollama API"

OLLAMA_URL="http://localhost:11434/api/tags"
OLLAMA_READY=false

for i in $(seq 1 15); do
  if curl -sf "$OLLAMA_URL" -o /dev/null 2>/dev/null; then
    OLLAMA_READY=true
    break
  fi
  sleep 2
done

if $OLLAMA_READY; then
  RESPONSE=$(curl -sf "$OLLAMA_URL" 2>/dev/null)
  pass "Ollama répond sur /api/tags"

  # Vérifier si mistral:7b est installé
  HAS_MISTRAL=$(echo "$RESPONSE" | jq -r '.models[]?.name' 2>/dev/null | grep -c 'mistral' || true)
  if [ "$HAS_MISTRAL" -gt 0 ]; then
    pass "Modèle mistral:7b détecté"
  else
    skip "mistral:7b non installé — exécuter : docker exec -it bayen-ollama ollama pull mistral:7b"
  fi
else
  fail "Ollama ne répond pas sur $OLLAMA_URL après 30s"
  info "Logs du container :"
  docker logs --tail 20 bayen-ollama 2>&1 | head -10
fi

# ──────────────────────────────────────────────────────────────
# 4. Directus — health check
# ──────────────────────────────────────────────────────────────
header "4/6 — Directus health check"

DIRECTUS_URL="http://localhost:8055/server/health"
DIRECTUS_READY=false

# Directus peut prendre plus de temps à démarrer (migrations, etc.)
info "Attente de Directus (peut prendre 30–60s au premier démarrage)..."
for i in $(seq 1 30); do
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$DIRECTUS_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    DIRECTUS_READY=true
    break
  fi
  sleep 2
done

if $DIRECTUS_READY; then
  RESPONSE=$(curl -sf "$DIRECTUS_URL" 2>/dev/null)
  STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)

  if [ "$STATUS" = "ok" ]; then
    pass "Directus health OK"
  else
    pass "Directus répond (status: $STATUS)"
  fi
else
  fail "Directus ne répond pas sur $DIRECTUS_URL après 60s"
  info "Logs du container :"
  docker logs --tail 30 bayen-directus 2>&1 | head -15
fi

# ──────────────────────────────────────────────────────────────
# 5. /custom/scan — produit connu (Bimo chocolat)
# ──────────────────────────────────────────────────────────────
header "5/6 — POST /custom/scan (6111080016394 — Bimo chocolat)"

SCAN_URL="http://localhost:8055/custom/scan"

if ! $DIRECTUS_READY; then
  skip "Directus n'est pas prêt — test sauté"
else
  RESPONSE=$(curl -sf -X POST "$SCAN_URL" \
    -H "Content-Type: application/json" \
    -d '{"barcode":"6111080016394","session_id":"test-infra-001"}' \
    2>/dev/null || echo '{"error":"curl_failed"}')

  FOUND=$(echo "$RESPONSE" | jq -r '.found' 2>/dev/null)
  SOURCE=$(echo "$RESPONSE" | jq -r '.source // empty' 2>/dev/null)
  SCORE=$(echo "$RESPONSE" | jq -r '.score.total // empty' 2>/dev/null)
  PRODUCT_NAME=$(echo "$RESPONSE" | jq -r '.product.name_fr // empty' 2>/dev/null)
  CONTRIBUTE_URL=$(echo "$RESPONSE" | jq -r '.contribute_url // empty' 2>/dev/null)
  ERROR=$(echo "$RESPONSE" | jq -r '.error // empty' 2>/dev/null)

  if [ -n "$ERROR" ] && [ "$ERROR" != "null" ] && [ "$ERROR" != "" ]; then
    fail "Erreur API : $ERROR"
    info "Réponse complète :"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  elif [ "$FOUND" = "true" ]; then
    pass "Produit trouvé ! source=$SOURCE"
    pass "Nom : $PRODUCT_NAME"
    pass "Score Bayen : $SCORE/100"
    info "  Détail score :"
    echo "$RESPONSE" | jq '{
      nutriscore_grade: .score.nutriscore_grade,
      nutriscore_points: .score.nutriscore_points,
      nova_group: .score.nova_group,
      nova_points: .score.nova_points,
      additives_points: .score.additives_points,
      incomplete: .score.incomplete
    }' 2>/dev/null
  elif [ "$FOUND" = "false" ]; then
    # C'est normal si le produit n'est ni en base ni sur OFF
    skip "Produit non trouvé (ni en base, ni sur Open Food Facts)"
    info "  contribute_url: $CONTRIBUTE_URL"
  else
    fail "Réponse inattendue"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  fi
fi

# ──────────────────────────────────────────────────────────────
# 6. /custom/scan — code-barres inventé (cas found: false)
# ──────────────────────────────────────────────────────────────
header "6/6 — POST /custom/scan (0000000000000 — code inventé)"

if ! $DIRECTUS_READY; then
  skip "Directus n'est pas prêt — test sauté"
else
  RESPONSE=$(curl -sf -X POST "$SCAN_URL" \
    -H "Content-Type: application/json" \
    -d '{"barcode":"0000000000000","session_id":"test-infra-002"}' \
    2>/dev/null || echo '{"error":"curl_failed"}')

  FOUND=$(echo "$RESPONSE" | jq -r '.found' 2>/dev/null)
  MESSAGE=$(echo "$RESPONSE" | jq -r '.message // empty' 2>/dev/null)
  CONTRIBUTE_URL=$(echo "$RESPONSE" | jq -r '.contribute_url // empty' 2>/dev/null)
  ERROR=$(echo "$RESPONSE" | jq -r '.error // empty' 2>/dev/null)

  if [ -n "$ERROR" ] && [ "$ERROR" != "null" ] && [ "$ERROR" != "" ]; then
    fail "Erreur API : $ERROR"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  elif [ "$FOUND" = "false" ]; then
    pass "found: false (comportement attendu)"
    pass "message: $MESSAGE"
    pass "contribute_url: $CONTRIBUTE_URL"
  elif [ "$FOUND" = "true" ]; then
    fail "found: true pour un code-barres inventé — inattendu !"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  else
    fail "Réponse inattendue"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  fi
fi

# ──────────────────────────────────────────────────────────────
# Résumé
# ──────────────────────────────────────────────────────────────
header "RÉSUMÉ"

TOTAL=$((PASS + FAIL + SKIP))
echo -e "  ${GREEN}✅ Réussis  : $PASS${NC}"
echo -e "  ${RED}❌ Échoués  : $FAIL${NC}"
echo -e "  ${YELLOW}⏭️  Sautés   : $SKIP${NC}"
echo -e "  ${BOLD}   Total    : $TOTAL${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}Tous les tests passent ! 🎉${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}$FAIL test(s) en échec.${NC}"
  echo ""
  info "Commandes de debug :"
  echo "  docker compose logs -f bayen-directus"
  echo "  docker compose logs -f bayen-tesseract"
  echo "  docker compose logs -f bayen-ollama"
  echo "  docker compose logs -f bayen-postgres"
  exit 1
fi
