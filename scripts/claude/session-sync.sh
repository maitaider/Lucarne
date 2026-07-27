#!/usr/bin/env bash
# Sync multi-machine (MacBook <-> Mac mini) — appelé par les hooks Claude Code
# (.claude/settings.json). Fail-open : ne bloque JAMAIS la session (exit 0 partout).
#
#   start : fetch origin ; fast-forward de main si on est dessus et propre ;
#           pull de la mémoire projet (repo privé lucarne-memory).
#           Émet un additionalContext décrivant l'état (à jour / derrière / hors-ligne).
#   end   : commit + push de la mémoire projet si modifiée (SessionEnd + PreCompact).
#
# La mémoire projet vit dans ~/.claude/projects/<clé-du-chemin>/memory, qui est un
# clone du repo privé github.com/maitaider/lucarne-memory. La clé est dérivée du
# chemin du projet (séparateurs remplacés par des tirets), donc le script marche
# quel que soit le chemin de clone et la machine.

set -u
MODE="${1:-start}"

# Jamais de prompt interactif (session non interactive) ; timeouts réseau courts.
export GIT_TERMINAL_PROMPT=0
GITNET=(-c http.lowSpeedLimit=1000 -c http.lowSpeedTime=10)

TOP=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
KEY=$(printf '%s' "$TOP" | tr '/_.' '---')
MEMDIR="$HOME/.claude/projects/$KEY/memory"

emit_context() { # $1 = message → JSON SessionStart valide
  python3 - "$1" <<'PY' 2>/dev/null || true
import json, sys
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": sys.argv[1]}}))
PY
}

if [ "$MODE" = "start" ]; then
  MSG=""

  # --- 1. Code : fetch + fast-forward de main -------------------------------
  if git "${GITNET[@]}" fetch --quiet origin main 2>/dev/null; then
    BRANCH=$(git symbolic-ref --short -q HEAD || echo "détaché")
    BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "?")
    if [ "$BRANCH" = "main" ] && [ "${BEHIND:-0}" != "0" ] && [ "$BEHIND" != "?" ]; then
      if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
        if git merge --ff-only --quiet origin/main 2>/dev/null; then
          MSG="Sync GitHub : main avancé de $BEHIND commit(s) → $(git log -1 --format='%h %s' | head -c 100)."
        else
          MSG="⚠️ Sync GitHub : main est derrière origin/main de $BEHIND commit(s) mais le fast-forward a échoué (divergence). Réconcilier avant de travailler."
        fi
      else
        MSG="⚠️ Sync GitHub : main est derrière origin/main de $BEHIND commit(s), mais il y a des modifications locales non commitées — pas de fast-forward auto. Intégrer origin/main avant de travailler."
      fi
    elif [ "$BRANCH" != "main" ]; then
      MSG="Sync GitHub : fetch OK. Branche « $BRANCH » ($BEHIND commit(s) derrière origin/main) — partir de origin/main à jour pour tout nouveau travail."
    else
      MSG="Sync GitHub : main est à jour avec origin/main."
    fi
  else
    MSG="⚠️ Sync GitHub impossible (hors-ligne ?). L'état local peut être en retard sur origin/main."
  fi

  # --- 2. Mémoire projet : pull du repo privé -------------------------------
  if [ -d "$MEMDIR/.git" ]; then
    if git -C "$MEMDIR" "${GITNET[@]}" pull --rebase --autostash --quiet 2>/dev/null; then
      MSG="$MSG Mémoire projet synchronisée (lucarne-memory)."
    else
      MSG="$MSG ⚠️ Pull de la mémoire projet (lucarne-memory) impossible — elle peut être périmée."
    fi
  fi

  emit_context "$MSG"
  exit 0
fi

# --- MODE end : pousser la mémoire si modifiée ------------------------------
if [ -d "$MEMDIR/.git" ]; then
  cd "$MEMDIR" || exit 0
  git add -A 2>/dev/null
  if ! git diff --cached --quiet 2>/dev/null; then
    git -c user.name="${GIT_AUTHOR_NAME:-Mehdi Aitaider}" \
        -c user.email="${GIT_AUTHOR_EMAIL:-mehdi.aitaider@gmail.com}" \
        commit --quiet -m "sync $(scutil --get LocalHostName 2>/dev/null || hostname -s) $(date +%F)" 2>/dev/null
  fi
  # Push même si le commit vient d'une session précédente restée locale.
  if [ -n "$(git log --branches --not --remotes 2>/dev/null | head -1)" ]; then
    git "${GITNET[@]}" pull --rebase --autostash --quiet 2>/dev/null
    git "${GITNET[@]}" push --quiet 2>/dev/null || true
  fi
fi
exit 0
