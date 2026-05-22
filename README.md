# Lucarne

> Pronostique le Mondial 2026 avec tes potes. / Predict the Cup with your crew.

Application web de paris entre amis pour la Coupe du Monde FIFA 2026 (48 équipes, 104 matchs, 11 juin → 19 juillet 2026).

## Stack

- **Next.js 16** (App Router, Turbopack, RSC, Server Actions)
- **TypeScript** strict
- **Tailwind CSS v4** + design tokens
- **Supabase** (Postgres + Auth + Realtime + Storage)
- **next-intl** (FR + EN)
- **Motion** (animations)
- **Lucide** (icônes)
- **Zod** + **React Hook Form** (forms)

## Démarrage

```bash
# 1. Installer les dépendances
pnpm install

# 2. Variables d'environnement
cp .env.local.example .env.local
# Remplir les clés Supabase (voir `pnpm db:start` ci-dessous)

# 3. Démarrer Supabase local (Docker requis)
pnpm db:start
# Copier l'anon key et le service_role key affichés vers .env.local

# 4. Appliquer les migrations
pnpm db:reset

# 5. Générer les types TypeScript depuis le schéma
pnpm db:types

# 6. Lancer le serveur de dev
pnpm dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de développement (Turbopack) |
| `pnpm build` | Build de production |
| `pnpm start` | Serveur de production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript sans émission |
| `pnpm db:start` | Démarrer Supabase local (Docker) |
| `pnpm db:stop` | Arrêter Supabase local |
| `pnpm db:reset` | Réinitialiser la DB locale |
| `pnpm db:types` | Générer les types TS depuis le schéma |
| `pnpm db:diff -f NAME` | Créer une nouvelle migration |

## Structure

```
src/
  app/
    [locale]/              # next-intl routing (fr, en)
      (marketing)/         # landing publique
      (auth)/              # login, signup
      (app)/               # zone authentifiée (dashboard, matches, etc.)
    api/                   # route handlers (auth callback, cron)
  components/
    brand/                 # logo, marks
    marketing/             # landing components
  i18n/                    # next-intl config
  lib/
    supabase/              # clients server/browser + proxy
    design-tokens.ts       # palette TS export
    utils.ts               # cn() helper
  proxy.ts                 # Next 16 middleware (auth + intl)
messages/
  fr.json, en.json         # strings UI
supabase/
  config.toml              # config local
  migrations/              # SQL migrations versionnées
```

## Plan d'implémentation

Plan complet : voir `~/.claude/plans/je-veux-que-tu-golden-coral.md`.

**Sprint 0 (cette livraison) :**
- ✅ Scaffold Next 16 + Tailwind v4 + TypeScript strict
- ✅ Design tokens "stade nocturne" (palette dark, fonts Bricolage + Inter + Geist Mono)
- ✅ i18n FR/EN avec next-intl + middleware (proxy en Next 16)
- ✅ Auth scaffolding (login + signup avec code d'invitation)
- ✅ Migration SQL initiale (profiles, leagues, bets, RLS, RPC)
- ✅ Landing page bilingue
- ✅ Layouts (marketing) / (auth) / (app)

Prochains sprints : voir le plan.

## Notes

- **iCloud sync** : `node_modules/` est dans iCloud Drive, ce qui ralentit certaines opérations (typecheck ~10× plus lent). Pour des perfs optimales, déplace le projet vers un dossier hors iCloud (ex: `~/Code/lucarne`).
- **Docker requis** pour Supabase local. Installer [OrbStack](https://orbstack.dev) (recommandé) ou Docker Desktop.
- **API-Football** : compte requis pour Sprint 1 (calendrier matchs en temps réel).
