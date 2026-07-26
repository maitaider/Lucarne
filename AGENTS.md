<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Multi-machine — TOUJOURS partir du dernier état GitHub

Ce projet est développé depuis plusieurs machines (MacBook + Mac mini) avec
plusieurs sessions/agents en parallèle. **GitHub (`origin/main`) est la seule
source de vérité.** Avant tout travail :

1. `git fetch origin main`
2. Si tu es sur `main` : `git merge --ff-only origin/main` (jamais de travail sur un main périmé).
3. Nouvelle branche depuis `origin/main`, jamais depuis un état local ancien.

Les sessions Claude Code font ce sync automatiquement au démarrage (hook
`scripts/claude/session-sync.sh` via `.claude/settings.json`). Si tu es un autre
agent/LLM, applique les étapes ci-dessus manuellement.

Conventions complètes du projet : voir `CLAUDE.md`.
