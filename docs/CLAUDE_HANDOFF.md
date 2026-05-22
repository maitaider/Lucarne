# Rapport pour Claude — refonte branding et landing

Date : 2026-05-22

## Contexte

Le projet est une app Next.js 16.2.6 + Supabase + next-intl pour des pronostics privés sur la Coupe du Monde 2026. Avant modification, la landing était fonctionnelle mais encore très scaffold : hero sans asset local fort, logo minimal, contenu court et sections limitées.

J'ai respecté la consigne `AGENTS.md` : lecture de la doc locale Next 16 avant code, notamment App Router, Server/Client Components, Image Optimization, CSS, Metadata/OG images et upgrade v16.

## Ce qui a été fait

- Nouveau visuel hero local : `public/marketing/lucarne-hero-stadium.jpg`.
  - Image générée avec le skill `imagegen`, puis convertie en JPG optimisé avec `sips` (~310 Ko).
  - Intégrée via `next/image` sur le hero, la section confiance et le layout auth.
- Branding renforcé :
  - Refonte du SVG `LucarneMark` en crest plus premium.
  - Ajout de `LucarneLogo` pour une utilisation cohérente dans la landing, le header app, le footer et l'auth layout.
- Landing page restructurée :
  - Hero plein écran avec image de stade, overlay lisible, CTA principal, CTA secondaire et preuves produit.
  - Nouvelle section produit avec trois bénéfices clairs.
  - Nouvelle section claire "Méthode" en trois étapes.
  - Nouvelle section "Confiance" avec fond image et arguments organisationnels.
- Contenu FR/EN amélioré dans `messages/fr.json` et `messages/en.json`.
- SEO/social preview :
  - Metadata Open Graph et Twitter ajoutées dans `src/app/[locale]/layout.tsx`.
- Qualité UI :
  - Palette globale ajustée vers un graphite plus premium.
  - Suppression des `tracking-tight` négatifs dans l'UI pour respecter les consignes design.
  - Cards marketing ramenées à `8px` de radius.
  - Auth layout rendu plus cohérent avec le nouveau branding.
- Nettoyage lint :
  - Correction du `setState` synchrone dans `Countdown`.
  - Suppression de l'effet inutile dans `MobileMenu`.
  - Retrait d'imports morts et correction du no-op rate limiter.

## Deuxième passe — design appliqué à l'app connectée

- Le layout app connecté utilise maintenant le visuel de stade comme atmosphère globale derrière tous les écrans : `src/app/[locale]/(app)/layout.tsx`.
- Le header app, les liens de navigation, le menu utilisateur et le menu mobile ont été alignés sur le style glass/dashboard du hero.
- Les écrans principaux ont reçu des headers/panels cohérents :
  - dashboard
  - matchs et onglets groupes/calendrier/phase finale
  - paris
  - ligues, création de ligue et invitations
  - classement global et détail de ligue
  - portefeuille
  - admin validations
- Les composants métier ont été harmonisés :
  - `MatchCard`, `GroupTableCard`, `Bracket`
  - `BetCard`, `BetForm`
  - `LeaderboardPodium`, `StandingsTable`
- Les tokens globaux ont été ajustés pour garder un look plus professionnel :
  - surfaces plus graphite/terrain nocturne
  - bordures plus fines et translucides
  - radius `xl/2xl` ramené à `8px`
  - ombres/glow plus proches de l'asset hero

## Troisième passe — dashboard façon console Coupe du Monde

- Le dashboard a été refondu en véritable cockpit inspiré de l'asset :
  - fond stade dans le panneau principal
  - cartes de matchs/pronostics en haut de console
  - tableau de classement intégré
  - organigramme compact de phase finale
  - anneaux de statistiques visuelles
  - accent gold renforcé pour la Coupe du Monde et le trophée
- Le contenu est désormais plus rempli même quand Supabase ne renvoie pas encore de données :
  - placeholders explicites "à venir" / "board prêt", sans faire croire à de fausses données utilisateur
  - rappels format tournoi : 48 équipes, 12 groupes, 104 matchs
  - panneaux de stratégie, suivi des tickets, exposition en jetons, ligues privées
- Les onglets principaux ont été enrichis dans le même langage visuel :
  - Matchs : centre tournoi, stats format/calendrier/arbre, signal live, structure de groupes de secours
  - Paris : salle des tickets, compteurs par statut, exposition en jetons, parcours d'état vide
  - Ligues : salons de compétition, métriques privé/premium/membres, cartes plus détaillées
  - Classement global : course au trophée, métriques leader/podium/victoires, preview quand le classement est vide
  - Portefeuille : banque de jetons avec métriques crédits/débits et historique mieux contextualisé
  - Admin validations : panneau de contrôle avec file, tickets et état vide professionnel
- Le détail d'une ligue a aussi été renforcé :
  - métriques membres, classés, paris, victoires
  - état vide plus utile pour inviter et préparer le board

## Quatrième passe — assets pro et suppression des emojis visibles

- Création d'assets vectoriels internes pour remplacer les symboles trop génériques :
  - `src/components/brand/sport-icons.tsx`
  - icône trophée, ballon orbital, grille terminal, projecteurs de stade
- Création d'un composant blason d'équipe sans emoji :
  - `src/components/team/team-emblem.tsx`
  - rendu circulaire premium, palette déterministe, code équipe ou fallback textuel
- Suppression des emojis visibles dans les cartes/pronostics :
  - dashboard
  - cartes de paris
  - détail d'un match
  - fallback de `Flag` quand aucun ISO country code n'est disponible
- Le panneau principal du dashboard a été rapproché de la référence :
  - grand panneau vitré
  - rail vertical d'icônes
  - header de terminal
  - cartes match avec blasons
  - tableau classement + organigramme
  - courbe de forme et anneaux statistiques directement dans la console

## Cinquième passe — interactivité et données réelles Coupe du Monde

- Ajout d'un dataset applicatif Coupe du Monde 2026 :
  - `src/data/world-cup-2026.ts`
  - 48 équipes, 16 stades, 104 matchs, villes, groupes, phases finales et watchlists joueurs.
  - Source déclarée dans le fichier : calendrier officiel FIFA + miroir structuré WorldCupHub indiqué comme données FIFA.com, vérifiés le 22 mai 2026.
- Le fallback local n'est plus vide :
  - `listMatches()` renvoie maintenant le calendrier réel si Supabase n'est pas configuré.
  - `getMatchById()` retrouve les fiches `wc26-001` à `wc26-104`.
  - `getGroupStandings()` construit les 12 tableaux de groupe à partir du calendrier réel, même sans résultats joués.
- Nouvelle console interactive du dashboard :
  - `src/components/dashboard/world-cup-data-deck.tsx`
  - onglets cliquables Matchs / Stades / Joueurs
  - sélection de match avec fiche détaillée et lien vers la route match
  - sélection de stade avec capacité et nombre de matchs
  - sélection d'équipe avec joueurs à suivre et note sur les listes finales FIFA attendues le 2 juin 2026
- Les tickets du cockpit principal sont maintenant cliquables vers les fiches match.
- Les cartes de match, tableaux de groupe et arbre de phase finale utilisent les blasons Lucarne au lieu de rendus drapeaux/emoji.
- Le détail match affiche maintenant les joueurs à suivre pour chaque équipe connue.
- Nouvelle migration Supabase non destructive :
  - `supabase/migrations/20260522010000_real_world_cup_2026_data.sql`
  - upsert des équipes/stades
  - remplacement par `match_number` des 104 matchs fictifs avec les données réelles
  - `flag_emoji` mis à `NULL` pour éviter les emojis en base

## Sixième passe — pack d'assets Lucarne

- Ajout d'un pack complet dans `public/assets/lucarne/`.
- Suite logo :
  - `logo/lucarne-mark-pro.svg`
  - `logo/lucarne-logo-horizontal.svg`
  - `logo/lucarne-badge-gold.svg`
- Icônes métier premium :
  - trophée, ballon orbital, projecteurs stade, arbre de phase finale, ticket de pari, console live.
- Visuels larges :
  - `images/dashboard-command-center.svg`
  - `images/stadium-night-poster.svg`
  - `images/social-preview.svg`
  - `images/empty-state-stadium.svg`
- Exports PNG générés dans `public/assets/lucarne/exports/` pour les usages externes qui n'acceptent pas SVG.
- Ajout d'un manifeste :
  - `public/assets/lucarne/asset-manifest.json`
  - `public/assets/lucarne/README.md`

## Fichiers clés à relire

- `src/components/marketing/landing-hero.tsx`
- `src/components/marketing/landing-features.tsx`
- `src/components/brand/lucarne-mark.tsx`
- `src/components/brand/sport-icons.tsx`
- `src/components/team/team-emblem.tsx`
- `src/data/world-cup-2026.ts`
- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/(auth)/layout.tsx`
- `src/app/[locale]/(app)/layout.tsx`
- `src/app/[locale]/(app)/dashboard/page.tsx`
- `src/app/[locale]/(app)/matches/page.tsx`
- `src/app/[locale]/(app)/matches/[matchId]/page.tsx`
- `src/components/dashboard/world-cup-data-deck.tsx`
- `src/app/[locale]/(app)/bets/page.tsx`
- `src/app/[locale]/(app)/leagues/page.tsx`
- `src/app/[locale]/(app)/leagues/[slug]/page.tsx`
- `src/app/[locale]/(app)/leaderboard/global/page.tsx`
- `src/app/[locale]/(app)/profile/wallet/page.tsx`
- `src/app/[locale]/(app)/admin/validations/page.tsx`
- `src/components/nav/app-header.tsx`
- `src/components/nav/nav-links.tsx`
- `src/components/match/match-card.tsx`
- `src/components/match/group-table.tsx`
- `src/components/match/bracket.tsx`
- `src/components/bet/bet-form.tsx`
- `src/components/leaderboard/standings-table.tsx`
- `messages/fr.json`
- `messages/en.json`
- `public/marketing/lucarne-hero-stadium.jpg`
- `supabase/migrations/20260522010000_real_world_cup_2026_data.sql`
- `public/assets/lucarne/asset-manifest.json`
- `public/assets/lucarne/README.md`
- `public/assets/lucarne/logo/`
- `public/assets/lucarne/icons/`
- `public/assets/lucarne/images/`
- `public/assets/lucarne/exports/`

## Vérifications passées

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:run` : 3 fichiers, 18 tests passés
- Vérification in-app browser sur `http://localhost:3001/fr/dashboard` :
  - données réelles visibles : Mexique vs Afrique du Sud, Estadio Banorte, 104/104 matchs
  - onglets Stades et Joueurs cliquables
  - liens `wc26-*` vers les fiches match
  - aucun débordement horizontal détecté sur la largeur testée
  - aucune erreur console navigateur
- Vérification assets :
  - `xmllint --noout` sur les SVG
  - parsing JSON du manifeste
  - exports PNG validés avec `file`
- Vérification locale sur `http://localhost:3000/fr`.
- Vérification CDP mobile en viewport 390px : `innerWidth`, `clientWidth`, `scrollWidth` et `bodyScrollWidth` à 390, donc pas de débordement horizontal réel.

## Notes pour la suite

- Il y a maintenant une migration Supabase de correction des seeds. Elle ne change pas le modèle métier ni les RPC, mais elle remet les données de référence au calendrier réel.
- Les routes app restent server-first ; les composants client existants n'ont été touchés que pour corriger le lint ou garder l'interaction.
- Le fichier `floating-flags.tsx` existe encore mais n'est plus utilisé dans la landing. Il peut être supprimé dans un nettoyage ultérieur si aucune autre itération ne prévoit de le réutiliser.
