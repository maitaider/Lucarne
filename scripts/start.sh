#!/usr/bin/env bash
# =============================================================================
# Lucarne — démarrage à froid (à lancer quand tu allumes l'ordi)
# =============================================================================
# Enchaîne les 3 briques nécessaires :
#   1. Docker Desktop (requis par Supabase local)
#   2. Supabase local (Postgres + Auth + Storage…)  → pnpm db:start
#   3. Serveur Next.js dev                            → pnpm dev
#
# Usage :
#   pnpm up           (recommandé)
#   ou : bash scripts/start.sh
#
# Ctrl+C arrête le serveur Next. Supabase + Docker restent allumés
# (relancer le script est instantané la fois suivante).
# =============================================================================

set -uo pipefail
cd "$(dirname "$0")/.."

green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

# --- 1. Docker ---------------------------------------------------------------
green "→ [1/3] Vérification de Docker…"
if docker info >/dev/null 2>&1; then
  green "  ✓ Docker tourne déjà."
else
  yellow "  Docker est éteint. Lancement de Docker Desktop…"
  open -a Docker 2>/dev/null || {
    red "  ✗ Impossible d'ouvrir Docker Desktop. Lance-le à la main puis relance ce script."
    exit 1
  }
  printf "  Attente du démarrage de Docker"
  # Poll jusqu'à 120s
  for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      printf "\n"
      green "  ✓ Docker est prêt."
      break
    fi
    printf "."
    sleep 2
  done
  if ! docker info >/dev/null 2>&1; then
    printf "\n"
    red "  ✗ Docker n'a pas démarré après 2 min. Ouvre Docker Desktop manuellement puis relance."
    exit 1
  fi
fi

# --- 2. Supabase local -------------------------------------------------------
green "→ [2/3] Démarrage de Supabase local…"
if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "supabase_db_lucarne"; then
  green "  ✓ Supabase tourne déjà."
else
  yellow "  Boot des conteneurs Supabase (peut prendre 1-2 min la 1ʳᵉ fois)…"
  pnpm db:start || {
    red "  ✗ Échec du démarrage Supabase. Vérifie Docker puis réessaie 'pnpm db:start'."
    exit 1
  }
  green "  ✓ Supabase prêt."
fi

# --- 3. Serveur Next ---------------------------------------------------------
green "→ [3/3] Démarrage du serveur Lucarne…"
green "  Ouvre  http://localhost:3000/fr  dans ton navigateur."
green "  (Ctrl+C pour arrêter le serveur)"
echo ""
exec pnpm dev
