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

## Conventions clés (détail dans CLAUDE.md)

- **Server-first** ; `"use client"` seulement si nécessaire. Mutations = Server Actions + Zod côté serveur.
- **Écritures `ref.*` / cross-user / valeurs contrôlées serveur** → RPC **SECURITY DEFINER** (modèles : `admin_recompute_match`, `admin_reply_ticket`, `league_feed`). Grant `to authenticated` (l'app appelle en tant qu'user) ou `to service_role` (cron). Toujours `notify pgrst, 'reload schema';` en fin de migration.
- **Classements = vues live** (`mv_global_standings`/`mv_league_standings`, regular views definer) lues directement depuis `bets.points` → pas de cache à invalider.
- `types.generated.ts` est **commité** (le build Git n'a que le repo). Régénérer (`pnpm db:types`, Supabase local requis) après chaque migration.
- i18n : aujourd'hui beaucoup de ternaires `locale === "fr" ? … : …` hors catalogue (dette, cf. item D).
- Pas de `revalidatePath` pendant un render de Server Component.

---

## Phase 3 — items restants (par ordre recommandé)

### A. Profils publics `/u/[username]` — [L] · *recommandé en premier*
**Objectif** : page publique (intra-ligue) d'un joueur + `@username` cliquables partout.
**Fichiers clés** : nouvelle route `src/app/[locale]/(app)/u/[username]/page.tsx` ; liens dans `src/components/leaderboard/standings-table.tsx`, `src/components/social/league-activity-feed.tsx`, `src/components/social/comment-thread.tsx` ; requêtes `src/lib/leagues/queries.ts` (standings), `src/lib/profile/`.

**Prompt :**
> Implémente les profils publics Lucarne. Crée `/[locale]/(app)/u/[username]/page.tsx` : avatar, display_name, `@username`, badge admin doré (réutilise le style de `standings-table.tsx`), total de points + rang global, nb de pronos, % de réussite, et les derniers pronostics réglés du joueur. Rends les `@username` cliquables vers `/u/<username>` dans le classement, le feed de ligue et les commentaires. Confidentialité stricte : jamais d'email ni de paiements. Lisibilité limitée aux membres de la ligue — si la RLS de `profiles` bloque, expose une vue/RPC definer dédiée (modèle `league_feed`). Vérifie + commit + déploie + confirme le vert.

### B. Notifs sociales + classement par phase + partage de prono — [XL]
**Objectif** : émettre les notifs sociales (infra `notifications` existe, jamais déclenchée), filtrer le classement par phase/journée, partager un prono.
**Fichiers clés** : table `notifications` + `notif_type` (migrations) ; `src/lib/social/`, `src/components/leaderboard/`, actions réactions/commentaires.

**Prompt :**
> Active les notifications sociales Lucarne. Émets une notif quand : un joueur est dépassé au classement, quelqu'un réagit à son prono, quelqu'un répond à son commentaire. Inserts cross-user → RPC/trigger SECURITY DEFINER (modèle `admin_reply_ticket`). Ajoute un filtre du classement global par phase (groupes / 8es / …) et par journée. Ajoute le partage d'un prono (lien public + image OG). Procède par sous-lots vérifiés (notifs, puis filtre, puis partage). Vérifie + commit + déploie.

### C. Données match riches — [XL] · *dépend en partie d'O3*
**Objectif** : timeline de buts, compos, classement de groupe « live », fiche stade sur `/matches/[matchId]`.
**Fichiers clés** : `src/app/[locale]/(app)/matches/[matchId]/page.tsx`, `ref.match_events`, `ref.players`, `src/lib/matches/group-standings.ts`.

**Prompt :**
> Enrichis `/matches/[matchId]` : timeline des buts (depuis `ref.match_events`, triée par minute), compos par équipe (depuis `ref.players`), classement de groupe « live » (recalcul depuis les matchs `finished`/`live`), fiche stade/ville. Les scores live automatiques dépendent du mapping O3 (voir Dette) ; la saisie admin manuelle alimente déjà `match_events`. Vérifie + commit + déploie.

### D. i18n → next-intl — [XL] · *surtout mécanique*
**Objectif** : migrer les ternaires `=== "fr"` vers les catalogues `messages/{fr,en}.json`.
**Fichiers clés** : `messages/fr.json`, `messages/en.json`, `src/i18n/`, `error.tsx`, `not-found.tsx`, nav, metadata.

**Prompt :**
> Migre l'i18n de Lucarne des ternaires `locale === "fr" ? … : …` vers les catalogues next-intl (`messages/{fr,en}.json` + `useTranslations`/`getTranslations`). Commence par : `error.tsx`, `not-found.tsx`, la navigation, et les metadata (passer de `export const metadata` statique FR à `generateMetadata` localisé). Procède **un namespace/écran à la fois**, `pnpm typecheck` + `pnpm test` après chaque lot, commit par lot. Déploie à la fin.

### E. Design-system + audit mobile — [L] · *un peu subjectif*
**Objectif** : unifier les radii arbitraires, généraliser `<Button>`/`<Field>`, vérifier 390px.
**Fichiers clés** : `src/app/globals.css` (`@theme`), `src/lib/design-tokens.ts`, `src/components/ui/button.tsx`, `src/components/ui/field.tsx`.

**Prompt :**
> Unifie le design-system Lucarne : remplace les `rounded-[8px]`/`[10px]`/`[12px]` arbitraires (200+ occurrences) par des tokens de radius cohérents (définis dans `globals.css`/`design-tokens.ts`) ; généralise les primitives `<Button>` et `<Field>` à la place des boutons/inputs ad-hoc. Fais un audit mobile à 390px et corrige les débordements. Vérifie + commit + déploie.

---

## Dette restante (hors Phase 3, non bloquant pour le lancement)

- **O3 — mapping fixtures** : le RPC `cron_sync_match` + le cron (échec bruyant) sont prêts, mais `ref.matches.api_football_fixture_id` reste à **peupler** (mapper les 104 matchs aux fixtures API-Football). **Bloqué** tant que la CdM 2026 n'est pas publiée dans API-Football (~plus près de juin). En attendant, la **saisie admin manuelle** fonctionne de bout en bout (score → réglage/recompute auto → LiveRefresh). Prompt de reprise : *« Peuple `api_football_fixture_id` : fetch des fixtures WC 2026 via `lib/football/api-football.ts`, mapping par date + équipes, RPC admin pour écrire le mapping. Teste que le cron `/api/cron/sync-matches` passe de "0 mappé" à N matché. »*
- **O8** : seed fantôme POL/BOL à nettoyer (migration de suppression prudente, attention aux FK).
- **`adjust_balance`** : retirer ce feature admin + la colonne « Solde » de `/admin/users` (résiduel jetons, `balance_cents` devenu inutile).

---

## Plans de référence
- `~/.claude/plans/lucarne-plan-consolide-2026-05-31.md` — plan consolidé v2 (revue + priorisation complète).
- Mémoire projet : `lucarne-critical-issues.md`, `product-model-pivot.md`.
