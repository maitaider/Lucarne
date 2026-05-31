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
5. **Pas de jetons / pas de balance gameplay** : le jeu est **gratuit, scoré en points**. Le buy-in (Stripe **ou** saisie admin manuelle) est un **accès** : les deux rails écrivent juste une ligne `real_payments` `confirmed` (`tokens_credited = 0`, aucune écriture `profiles.balance_cents`, aucune ligne `transactions`). `balance_cents` / `transactions` / `token_price_cents` sont **résiduels** (dette à retirer) — ne pas s'en servir pour débloquer une fonctionnalité ; l'accès se vérifie via `getMyBuyInStatus()` (lit `real_payments`).

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

**Phase 0 (sécurité & argent) livrée** : C1 escalade privilèges (colonnes `profiles` en liste blanche), C2 fuite classements (anon revoke + `mv_league_standings` filtrée au caller), C3 `isAdmin()` fail-closed, gardes `set_user_role`, Stripe anti double-crédit (M3) + anti sous-paiement (M2), économie éditable (prix d'accès + devise, M1).

**Phase 1 (cohérence du modèle) livrée** : purge jetons côté joueur (`/bets` → « Mes pronostics / points », `bet-card`, feed temps réel, dashboard), unification des 2 rails de paiement (le manuel = accès, 0 jeton, comme Stripe), feed de ligue O5 via RPC `league_feed` SECURITY DEFINER (lié aux membres, pas à `bets.league_id`), page reçus `/profile/wallet` (M6), copy (ligue admin-only, prix landing dynamique, coquilles EN).

**Phase 2 (ops & données live) livrée** : O1 recompute (`admin_recompute_match` + `admin_set_match_result` re-score à chaque `finished` + bouton), O2 buteurs préservés (pré-remplissage `match_events` + typeahead roster, fin de la perte silencieuse), O4 `LiveRefresh` sur `/live`/`/matches`/`/matches/[matchId]`, O9 fuseau par défaut `America/Toronto` (audience QC), outillage admin (réponse aux tickets `admin_reply_ticket` + notif joueur ; journal d'audit `admin_list_audit_log` + page `/admin/audit`), scaffold sync auto (RPC `cron_sync_match` service-role par `api_football_fixture_id` + cron qui échoue bruyamment ; suppression du 2ᵉ client API-Football mort, O7).

**Reste (dette / à faire)** : **O3 mapping fixtures** — peupler `ref.matches.api_football_fixture_id` (bloqué : la CdM 2026 n'est pas encore publiée dans API-Football ; le cron rapporte « 0 mappé » jusque-là) ; **O8** seed fantôme POL/BOL ; retrait du feature `adjust_balance` + colonne « Solde » admin (résiduel jetons) ; **Phase 3** (profils publics `/u/[username]`, notifs sociales, classement par phase, i18n → next-intl, états loading/not-found, a11y, distribution cagnotte assistée).

Plan complet : `~/.claude/plans/lucarne-plan-consolide-2026-05-31.md`.
