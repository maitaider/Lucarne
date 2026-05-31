# Lucarne — Handoff Phase 3 (reprise en nouvelle session)

> Document de contexte + prompts prêts à coller pour finir la **Phase 3**.
> Dernière mise à jour : 2026-05-31. Phases 0, 1, 2 + amorce Phase 3 = **en prod**.

---

## ▶︎ Pour démarrer une session (colle ceci)

> Lis `PHASE-3-HANDOFF.md` à la racine du repo pour le contexte complet (Lucarne,
> Phases 0–2 livrées, conventions), puis lis `CLAUDE.md` (garde-fous). Ensuite
> attaque **<ITEM CI-DESSOUS>**. Respecte le workflow : migrations en local **et**
> remote, `pnpm db:types` régénéré + commité, `pnpm typecheck` + `pnpm test` +
> `pnpm build` verts avant de déployer, `git push origin main` pour déclencher le
> build Vercel (GitHub-integration), puis **vérifie sur le remote avant d'affirmer
> que c'est réglé** (ne suppose pas).

Remplace `<ITEM CI-DESSOUS>` par un des blocs **Prompts** plus bas.

---

## 30 secondes de contexte

- **Lucarne** = pool de **pronostics privé entre amis** pour la **Coupe du Monde 2026**. Jeu **gratuit, scoré en points** (PAS un bookmaker). Accès unique payant (~20 $ CA via Stripe **ou** saisie admin manuelle) = juste un *accès*, **aucun jeton**. Top 3 se partage un « pot » informel.
- **Stack** : Next.js 16 (App Router, RSC), TypeScript strict, Tailwind v4, next-intl FR/EN (`localePrefix: "always"`), Supabase (`@supabase/ssr`, RLS, RPC SECURITY DEFINER, schémas `public`/`ref`/`private`).
- **Prod** : `www.lucarne.ca`. Deploy = `git push origin main` → build GitHub-integration Vercel (re-vérifier via `npx vercel inspect <url>` → `status ● Ready` + alias). Remote Supabase ref `iqttcudmauyqmyewjlzf`.
- **Admin** = Mehdi (super_admin). Ligue « maison » unique, **admin-only** ; les joueurs rejoignent via code d'invitation (auto-join).

## État livré (ne pas refaire)

- **Phase 0 (sécurité & argent)** : C1 escalade privilèges (colonnes `profiles` en liste blanche), C2 fuite classements (anon revoke + `mv_league_standings` filtrée au caller), C3 `isAdmin()` fail-closed, gardes `set_user_role`, Stripe anti double-crédit/sous-paiement, économie éditable (prix d'accès + devise).
- **Phase 1 (modèle)** : jetons purgés côté joueur, 2 rails de paiement unifiés (accès, 0 jeton), feed de ligue `league_feed` (RPC definer, lié aux membres), page reçus `/profile/wallet`, prix landing dynamique.
- **Phase 2 (ops live)** : `admin_recompute_match` + recompute auto au `finished`, buteurs pré-remplis dans `/admin/matches`, `LiveRefresh` sur /live & /matches, fuseau **America/Toronto** par défaut, réponse aux tickets (`admin_reply_ticket`) + journal d'audit (`admin_list_audit_log` → `/admin/audit`), scaffold cron (`cron_sync_match`).
- **Phase 3 (amorce)** : `React.cache(listMatches)`, `loading.tsx`, `not-found.tsx` localisé, a11y formulaire support.
- **Phase 3 — item A** : profils publics `/u/[username]` + `@username` cliquables, en prod (2026-05-31). Voir le détail sous « Phase 3 — items restants ».
- **Phase 3 — item B** : notifs sociales (réaction / commentaire / dépassement) + classement filtré par phase/journée + partage de prono (lien public + OG), en prod (2026-05-31). Détail sous « Phase 3 — items restants ».
- **Phase 3 — item C** : données match riches (timeline buts, classement de groupe live, effectifs, fiche stade) sur `/matches/[matchId]`, en prod (2026-05-31).
- **Phase 3 — item D** : i18n next-intl — 1re tranche (error/not-found/metadata localisés via `generateMetadata`), en prod. **Reste itératif** : nav + ~630 ternaires.
- **Phase 3 — item E** : design-system — 1re tranche (sweep radii arbitraires → tokens `@theme`, 73 fichiers, zéro changement visuel), en prod. **Reste** : orphelins 10/7/14px, primitives `<Field>`/`<Input>`, audit mobile.

## Conventions clés (détail dans CLAUDE.md)

- **Server-first** ; `"use client"` seulement si nécessaire. Mutations = Server Actions + Zod côté serveur.
- **Écritures `ref.*` / cross-user / valeurs contrôlées serveur** → RPC **SECURITY DEFINER** (modèles : `admin_recompute_match`, `admin_reply_ticket`, `league_feed`). Grant `to authenticated` (l'app appelle en tant qu'user) ou `to service_role` (cron). Toujours `notify pgrst, 'reload schema';` en fin de migration.
- **Classements = vues live** (`mv_global_standings`/`mv_league_standings`, regular views definer) lues directement depuis `bets.points` → pas de cache à invalider.
- `types.generated.ts` est **commité** (le build Git n'a que le repo). Régénérer (`pnpm db:types`, Supabase local requis) après chaque migration.
- i18n : aujourd'hui beaucoup de ternaires `locale === "fr" ? … : …` hors catalogue (dette, cf. item D).
- Pas de `revalidatePath` pendant un render de Server Component.

---

## Phase 3 — items restants (par ordre recommandé)

### A. Profils publics `/u/[username]` — ✅ LIVRÉ (2026-05-31, commit `fbbef40`)
**Objectif** : page publique (intra-ligue) d'un joueur + `@username` cliquables partout.
**Livré** :
- Migration `20260531200000_public_profile_rpc.sql` (local + remote) : RPC definer `public_profile` + `profile_recent_bets` + interne `resolve_viewable_profile`. Gate intra-ligue **via `league_members`** (modèle `league_feed`, pas `bets.league_id`) ; jamais email/argent ; seuls les paris `settled` exposés (aucune fuite de prono avant coup d'envoi). `mv_global_standings` est resté lisible `authenticated` → réutilisé pour le rang global.
- Page `src/app/[locale]/(app)/u/[username]/page.tsx` : avatar, badge admin doré, rang global + points + nb de pronos + % de réussite (`wins/settled`), derniers pronostics réglés (score final, prono, résultat). **404 si non co-membre** (ne confirme pas l'existence d'un username). `generateMetadata` titre `@username`.
- Lib `src/lib/profile/public-profile.ts` (`getPublicProfile`, `getProfileRecentBets`).
- `@username` cliquables → `/u/<username>` dans `standings-table.tsx`, `podium.tsx`, `league-activity-feed.tsx`, `comment-thread.tsx`.
- Vérifié : test SQL e2e local (gate allow/deny/admin, joins, casts) + RPC live remote (HTTP 200) + Vercel `● Ready` + route prod 307→login (FR & EN). *Non fait : rendu navigateur authentifié (dev server bloqué par le sandbox local ; pas de session prod headless).*

### B. Notifs sociales + classement par phase + partage de prono — ✅ LIVRÉ (2026-05-31, commits `fce84ab` / `a539045` / `4e20f35`)
**Livré en 3 sous-lots vérifiés (chacun e2e en SQL) :**

1. **Notifs sociales** (`20260531210000` + `20260531210100`) — triggers definer : `reaction_received` (réaction sur prono/commentaire → proprio, exclut self), `comment_received` (commentaire → commentateurs précédents + proprio du prono), `league_position` (dépassé au classement → snapshot des rangs diffé dans `admin_recompute_match`, table `standings_snapshot`, seed anti-spam). UI : rendu des 3 types dans `notifications-list.tsx` + `notifications-bell.tsx`.
2. **Classement par phase/journée** (`20260531220000`) — RPC `standings_filtered(p_stage, p_matchday)` ; filtres server-first sur `/leaderboard/global` (`?phase=&jour=`, onglets Phase + sous-onglets Journée J1-3 ; journée de groupe dérivée chronologiquement). Cagnotte masquée hors « Tout ».
3. **Partage de prono** (`20260531230000`) — RPC `shared_prediction` (anon+auth, révèle uniquement post-coup d'envoi). Page publique `/[locale]/p/[betId]` (hors `(app)`) + `opengraph-image.tsx` (next/og) + `<SharePredictionButton>` sur `/matches/[id]` (match démarré).

**Vérifié** : SQL e2e local (3 triggers + exclusion self + idempotence ; filtre J1/J2/final ; révèle/cache/bogus) + 4 migrations live remote (RPC `shared_prediction` anon HTTP 200, `standings_filtered` HTTP 200) + build + Vercel. *Non fait : rendu navigateur authentifié (sandbox).*

### C. Données match riches — ✅ LIVRÉ (2026-05-31, commit `9aa40ac`)
**Livré sur `/matches/[matchId]`** (aucune migration — colonnes `ref.*` existantes) :
- Timeline des buts (`ref.match_events` via `getMatchEvents`, triée par minute, marqueurs pén./csc).
- Classement de groupe « live » (réutilise `getGroupStandings` + `GroupTableCard`, filtré au groupe du match).
- Effectifs par équipe (`ref.players` via `listPlayersForTeams`, groupés GK/DEF/MID/FWD).
- Fiche stade enrichie (`getMatchById`/`VenueSnippet` + pays + capacité).

*Vérifié : typecheck + build + données (32 venues country/capacity, rosters seedés). Timeline non testable en local (aucun `match_events` seedé — admin-entered).*

### D. i18n → next-intl — 🟡 1re tranche LIVRÉE (commit `b2ca744`), itératif
**Livré** : namespaces `errors` / `notFound` / `metadata` (`messages/{fr,en}.json`) ; `error.tsx` → `useTranslations`, `not-found.tsx` → `getTranslations`, root layout `export const metadata` FR → `generateMetadata` localisé (OG/Twitter/alt), `/p/[betId]` metadata localisée.
**Reste (sous-tranches suivantes)** : la **navigation** (`nav-links` / `user-menu` / `mobile-menu` / `app-header` — tableaux `{fr,en}` + ternaires) ; puis le gros des **~630 ternaires `locale === "fr"`** écran par écran (top fichiers : `bracket-builder`, `economy-form`, `world-cup-data-deck`, `cockpit`, `leagues/page`…). Procéder un namespace/écran à la fois, typecheck+test+commit par lot.

**Prompt (reprise) :**
> Continue la migration i18n next-intl de Lucarne. Fais la navigation (`src/components/nav/*` : remplace les tableaux `{fr,en}` et ternaires par un namespace `nav` + `useTranslations`), puis enchaîne écran par écran sur les ~630 ternaires `locale === "fr"` restants. typecheck+test+commit par lot, déploie à la fin.

### E. Design-system + audit mobile — 🟡 1re tranche LIVRÉE (commit `e4fb613`), itératif
**Livré** : sweep des rayons exacts vers les tokens `@theme` (valeur identique, **zéro changement visuel**) sur 73 fichiers — `rounded-[8px]→rounded-sm`, `[12px]→rounded-md`, `[6px]→rounded-xs`, `[16px]→rounded-lg` ; `section-panel.tsx` re-tokenisé. (Tokens `--radius-*` existaient déjà ; le sweep n'a fait que remplacer les arbitraires.)
**Reste** : orphelins `rounded-[10px]` (63×) / `[7px]` (20×) / `[14px]` (12×) / `[3px]` — pas de token exact, snap = choix visuel à trancher ; primitives `<Field>`/`<Input>`/`<Textarea>` (radius input actuel 16px → 8px = subjectif, à généraliser sur login/signup/create-league/admin) ; audit mobile 390px (`group-table` `min-w-[440px]` et `cockpit` MiniBracket `min-w-[460px]` sont déjà en `overflow-x-auto` → acceptable, à confirmer visuellement).

**Prompt (reprise) :**
> Continue le design-system Lucarne : décide d'un snap pour les radii orphelins (10/7/14px → token le plus proche), extrais les primitives `<Field>`/`<Input>`/`<Textarea>` dans `src/components/ui/` (radius `rounded-sm`) et applique-les aux formulaires (login, signup, create-league, admin), puis audit mobile 390px. Vérifie + commit + déploie.

---

## Dette restante (hors Phase 3, non bloquant pour le lancement)

- **O3 — mapping fixtures** : le RPC `cron_sync_match` + le cron (échec bruyant) sont prêts, mais `ref.matches.api_football_fixture_id` reste à **peupler** (mapper les 104 matchs aux fixtures API-Football). **Bloqué** tant que la CdM 2026 n'est pas publiée dans API-Football (~plus près de juin). En attendant, la **saisie admin manuelle** fonctionne de bout en bout (score → réglage/recompute auto → LiveRefresh). Prompt de reprise : *« Peuple `api_football_fixture_id` : fetch des fixtures WC 2026 via `lib/football/api-football.ts`, mapping par date + équipes, RPC admin pour écrire le mapping. Teste que le cron `/api/cron/sync-matches` passe de "0 mappé" à N matché. »*
- **O8** : seed fantôme POL/BOL à nettoyer (migration de suppression prudente, attention aux FK).
- **`adjust_balance`** : retirer ce feature admin + la colonne « Solde » de `/admin/users` (résiduel jetons, `balance_cents` devenu inutile).

---

## Plans de référence
- `~/.claude/plans/lucarne-plan-consolide-2026-05-31.md` — plan consolidé v2 (revue + priorisation complète).
- Mémoire projet : `lucarne-critical-issues.md`, `product-model-pivot.md`.
