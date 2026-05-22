# Lucarne — guide Claude Code

Projet : application web Next.js 16 + Supabase pour les paris sur la Coupe du Monde 2026.
Stack : Next 16 (App Router), TypeScript strict, Tailwind v4, Supabase, next-intl FR/EN.

## Commandes utiles

```bash
pnpm dev          # dev server (Turbopack)
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm db:start     # Supabase local (Docker requis)
pnpm db:reset     # reset + applique migrations
pnpm db:types     # régénère src/lib/supabase/types.generated.ts
```

## Conventions

- **Server-first** : Server Components par défaut. `"use client"` uniquement quand nécessaire (forms interactifs, Realtime, navigation programmatique).
- **Mutations** : Server Actions (pas d'API routes), validation Zod côté serveur, idempotence via `client_request_id`.
- **i18n** : strings UI dans `messages/{fr,en}.json` namespacées (`common.*`, `auth.*`, `landing.*`). Noms d'équipes/stades bilingues en colonnes DB (`name_fr`, `name_en`).
- **Design tokens** : couleurs et radii définis dans `src/app/globals.css` (Tailwind v4 `@theme`). Miroir TS dans `src/lib/design-tokens.ts`.
- **Sécurité paris** : insertion via RPC `place_bet` SECURITY DEFINER uniquement. Timing serveur (`now()`), buffer 60s avant kickoff. RLS anti-copie sur `bets.SELECT`.
- **Schémas Postgres** : `public` (métier), `ref` (référence : teams, matches), `private` (admin : validations, audit_log — non exposé via PostgREST).

## Garde-fous critiques

1. **Jamais de timestamp client pour `submitted_at`** — toujours `now()` côté serveur.
2. **Jamais d'INSERT direct sur `bets`** depuis le client — passer par RPC.
3. **`private.*` non exposé** via PostgREST (RLS + REVOKE).
4. **Codes d'invitation** : `gen_random_bytes(16)` base32 lisible, expiration max 30j.
5. **Balances** : `transactions` append-only, trigger recompute `profiles.balance_cents`.

## Phase actuelle

Sprint 0 livré : scaffold + design + auth + migration. Prochain : Sprint 1 (intégration API-Football + import matchs).

Plan complet : `~/.claude/plans/je-veux-que-tu-golden-coral.md`.
