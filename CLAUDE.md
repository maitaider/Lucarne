# Lucarne — guide Claude Code

Projet : application web Next.js 16 + Supabase pour les paris sur la Coupe du Monde 2026.
Stack : Next 16 (App Router), TypeScript strict, Tailwind v4, Supabase, next-intl FR/EN.

## Mode opératoire (s'applique à chaque session, sans rappel)

> Réinjecté à chaque démarrage par le hook `SessionStart` **global** (`~/.claude/hooks/session-start.sh`, vaut pour tous les projets).

- **Vérifie, n'assume jamais** : avant d'affirmer, va voir le code / la DB / la réalité, reproduis, cite la preuve (`fichier:ligne`, sortie de commande). Dans le doute, vérifie — ne devine pas, n'invente pas.
- **Proactif & zéro fainéantise** : corrige la cause racine, gère les cas limites, va jusqu'au bout. Pas de demi-mesure ni de « tu pourrais faire X » quand tu peux le faire toi-même.
- **Résous avant de répondre** : débloque-toi seul (lis, teste, cherche) ; ne sollicite l'utilisateur que pour une décision qui lui appartient vraiment.
- **Vérifie avant « c'est réglé »** : exécute (`pnpm typecheck`, build, tests, ou l'app) et observe le résultat réel.
- **Mémoire & instructions vivantes** : dès qu'un élément durable apparaît (décision, convention, architecture, leçon, préférence, état d'avancement), écris-le toi-même dans la mémoire projet et/ou ce fichier — sans qu'on te le demande. Reste concis, déduplique, élague le périmé ; en fin de session, résume ce que tu as changé.
- **Continuité inter-sessions** : au démarrage, recharge la mémoire + ce guide ; retrouve un travail passé dans l'historique des sessions si besoin.
- **Garde-fous** : branche dédiée (jamais `main` en direct) ; commit/push seulement si demandé ; prudence avec les secrets et les actions irréversibles ; respecte les conventions existantes du projet.

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
- **Avatars** : toujours `<UserAvatar src={avatar_url} name={display_name ?? username} … />` (`src/components/ui/user-avatar.tsx`) — affiche la photo si `avatar_url`, sinon les initiales. Ne **jamais** re-coder un badge d'initiales local. Toute requête listant des users doit sélectionner `avatar_url`. Rendu en `<img>` brut (URLs Supabase Storage publiques), pas `next/image`.
- **Sécurité paris** : insertion via RPC `place_bet` SECURITY DEFINER uniquement. Timing serveur (`now()`), buffer **1 h** avant kickoff (étendu de 60s → 1h en `20260522060000`). RLS anti-copie sur `bets.SELECT`.
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
8. **`mv_global_standings` / `mv_league_standings` sont des VUES NORMALES (live), pas matérialisées** — malgré le préfixe `mv_`. La migration `20260530220000_standings_all_players.sql` a fait `drop materialized view` + `create view` (puis `20260530230000` les recrée en `view` avec `role`). Donc les colonnes d'identité (`avatar_url`, `display_name`, `role`) y sont **fraîches** (lues en direct depuis `profiles`) — pas besoin de refresh. Ne pas redévelopper une logique de péremption MV. Vérifié (2026-05-31) en psql via `docker exec supabase_db_lucarne` : `relkind='v'`, et un `update profiles.avatar_url` se reflète instantanément dans la vue. Par robustesse, `getGlobalStandings`/`getLeagueStandings` superposent quand même les identités live (`withLiveIdentities`) au cas où un env aurait dérivé vers une matview périmée.
9. **DB locale ≠ DB de l'utilisateur.** Le Supabase local (`127.0.0.1:54321`) a les données de référence (`ref.teams`=58, `ref.matches`=104) mais **0 profil** : les usagers (`@mehdi`, `@test4`…) et leurs avatars vivent sur le **remote lié** `iqttcudmauyqmyewjlzf` (déployé Vercel). Un bug d'UI rapporté par l'utilisateur est sur la prod ; le local ne peut pas le reproduire sans seed. Et **une modif non committée n'est jamais visible en prod** — vérifier `git status` avant de conclure « ça ne marche pas » : c'est souvent juste pas déployé.

## Phase actuelle

**Phase 0 (sécurité & argent) livrée** : C1 escalade privilèges (colonnes `profiles` en liste blanche), C2 fuite classements (anon revoke + `mv_league_standings` filtrée au caller), C3 `isAdmin()` fail-closed, gardes `set_user_role`, Stripe anti double-crédit (M3) + anti sous-paiement (M2), économie éditable (prix d'accès + devise, M1).

**Phase 1 (cohérence du modèle) livrée** : purge jetons côté joueur (`/bets` → « Mes pronostics / points », `bet-card`, feed temps réel, dashboard), unification des 2 rails de paiement (le manuel = accès, 0 jeton, comme Stripe), feed de ligue O5 via RPC `league_feed` SECURITY DEFINER (lié aux membres, pas à `bets.league_id`), page reçus `/profile/wallet` (M6), copy (ligue admin-only, prix landing dynamique, coquilles EN).

**Phase 2 (ops & données live) livrée** : O1 recompute (`admin_recompute_match` + `admin_set_match_result` re-score à chaque `finished` + bouton), O2 buteurs préservés (pré-remplissage `match_events` + typeahead roster, fin de la perte silencieuse), O4 `LiveRefresh` sur `/live`/`/matches`/`/matches/[matchId]`, O9 fuseau par défaut `America/Toronto` (audience QC), outillage admin (réponse aux tickets `admin_reply_ticket` + notif joueur ; journal d'audit `admin_list_audit_log` + page `/admin/audit`), scaffold sync auto (RPC `cron_sync_match` service-role par `api_football_fixture_id` + cron qui échoue bruyamment ; suppression du 2ᵉ client API-Football mort, O7).

**Phase 3 (engagement & qualité) — entamée (itératif)** : ✅ tranche qualité — perf `React.cache(listMatches)` (déduplique les ~7 appels layout+pages par requête), `loading.tsx` (squelette app), `not-found.tsx` localisé, a11y formulaire support (`htmlFor`/`id`). ✅ avatars partout — composant partagé `<UserAvatar>` (`src/components/ui/user-avatar.tsx`) ; photo de profil affichée dans classement (podium, table, mini-widget dashboard), feed/commentaires de ligue, listes admin (inscriptions + users, `avatar_url` ajouté au SELECT `listAdminUsers`). ✅ gestion des joueurs (admin, page `/admin/users`) — **création** de compte (`createUser` : `auth.admin.createUser` service-role → trigger `handle_new_user`, puis `admin_finalize_new_user` pose le rôle + auto-join ligue maison ; case « déjà payé » → `record_payment` ; identifiants affichés à copier), **archivage** réversible (`admin_archive_user`/`admin_restore_user`, `deleted_at` ; lockout effectif via `getCurrentUser`/`isAdmin` qui filtrent `deleted_at` + rejet à la connexion), **purge** définitive (`admin_purge_user` → `delete from auth.users` cascade ; refusée si `real_payments`/ligue liés — FK `restrict` ; flag UI `can_purge`). Gardes calquées sur `set_user_role` (super_admin requis pour agir sur un admin ; jamais soi-même ni le dernier super_admin). Migration `20260531240000`. Reste (XL, sessions dédiées) : profils publics `/u/[username]` + `@username` cliquables, notifs sociales, classement par phase, partage de prono, timeline de buts / compos, i18n → next-intl, design-system (radii, `<Button>`/`<Field>`), distribution cagnotte assistée.

**Reste (dette)** : **O3 mapping fixtures** — peupler `ref.matches.api_football_fixture_id` (bloqué : la CdM 2026 n'est pas encore publiée dans API-Football ; le cron rapporte « 0 mappé » jusque-là) ; **O8** seed fantôme POL/BOL ; retrait du feature `adjust_balance` + colonne « Solde » admin (résiduel jetons).

Plan complet : `~/.claude/plans/lucarne-plan-consolide-2026-05-31.md`.
