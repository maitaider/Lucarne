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

## Débogage — leçons de prod (À LIRE avant de deviner)

Quand un comportement est cassé **sans message d'erreur** (login qui reboucle, données vides, paiement non reconnu), c'est presque toujours la **couche base de données**, pas la logique app. Ne pas supposer — vérifier la DB d'abord.

1. **Permissions `public` après reconstruction du remote.** `db reset --linked` applique les migrations mais **pas** les grants par défaut que Supabase configure en local. Si le schéma initial ne fait qu'un `grant usage on schema public` (sans `grant select/insert/... on all tables`), **chaque table renvoie `42501 permission denied`** pour anon/authenticated/service_role. Symptôme : `getCurrentUser()` lit `profiles`, la lecture est refusée → `null` → l'app croit l'utilisateur déconnecté → rebouclage `/login` **sans erreur**. Toujours grant explicitement les tables `public` aux rôles PostgREST (cf. migration `20260530140000`), comme c'est déjà fait pour `ref`.
2. **Une lecture refusée renvoie `null`, pas une exception** côté supabase-js (le code fait souvent `const { data } = await ...` sans checker `.error`). Donc « pas d'erreur affichée » ≠ « tout va bien ».
3. **Écritures côté client = RLS obligatoire.** Une fonctionnalité qui `insert/update` en tant qu'utilisateur `authenticated` a besoin d'une policy RLS correspondante. Si les valeurs doivent être **contrôlées par le serveur** (montants, crédits, statuts), faire l'écriture avec le **client service-role** (`getSupabaseAdmin()`), pas le client de l'utilisateur. Ex. : `stripe_checkouts` n'a qu'une policy write admin → le pré-enregistrement du checkout doit passer par le service-role, sinon `fulfill_stripe_checkout` lève `checkout_not_found` et le paiement n'est jamais reconnu.
4. **Vérifier, ne pas affirmer.** Avant de dire « c'est réglé », reproduire l'opération exacte qui échoue (ex. lire `profiles` avec un vrai jeton `authenticated`, vérifier l'état réel des tables avec la clé service-role). Diagnostiquer la cause racine soi-même plutôt que de demander à l'utilisateur d'intervenir.
5. **`NEXT_PUBLIC_*` sur Vercel** : type `encrypted` (jamais `sensitive`) sinon non inliné au build → `undefined` côté client/serveur. Les vars server-only peuvent rester `sensitive`. Les ajouter via l'API REST Vercel (le CLI `vercel env add` stocke des valeurs vides dans cet environnement).
6. **`revalidatePath()` ne s'appelle PAS pendant un render.** Une Server Action (`"use server"`) appelée depuis un *Server Component pendant le render* (ex. `await confirmStripeCheckout()` dans `buy-in/page.tsx`) ne doit pas appeler `revalidatePath` — ça lève « used revalidatePath during render which is not allowed » et déclenche l'error boundary *après* coup (le paiement était déjà crédité, mais l'utilisateur voit un écran d'erreur). `revalidatePath` est OK uniquement dans une action déclenchée par le client. Quand on `redirect()` ensuite, la revalidation est inutile (navigation fraîche).
7. **`types.generated.ts` est commité** (pas gitignoré) pour que le build GitHub-integration réussisse. Le `vercel` CLI uploade le dossier local ; le build Git, lui, n'a que le repo. Régénérer (`pnpm db:types`) + committer après chaque migration.

## Phase actuelle

Sprint 0 livré : scaffold + design + auth + migration. Prochain : Sprint 1 (intégration API-Football + import matchs).

Plan complet : `~/.claude/plans/je-veux-que-tu-golden-coral.md`.
