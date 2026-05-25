# Rapport pour Claude — analyse et prochaines améliorations

Date : 2026-05-25

## 1. Analyse des derniers changements

Les derniers commits ont fortement clarifié le produit :

- `Dashboard: kill the cockpit, ship a focused TodayPanel`
  - Bon choix produit : le dashboard est redevenu plus lisible et centré sur "quoi faire maintenant".
  - Risque : on a perdu une partie de l'effet premium / Coupe du Monde qui faisait la différence visuelle. Le `TodayPanel` est utile, mais il ressemble davantage à un panneau utilitaire qu'à un vrai command center.
- `Merge /bracket + /picks -> /predict`
  - Très bonne consolidation : l'utilisateur n'a plus à comprendre deux routes pour pronostiquer.
  - Risque : la page `/predict` est devenue très dense. Il faut guider avec progression, sticky summary et micro-sections plus nettes.
- `4-tab nav + /live + reset bracket + Mon scénario + dashboard countdown`
  - La navigation est plus simple et mieux groupée.
  - Risque : les pages secondaires sont cachées dans des dropdowns. Chaque dropdown doit être très clair et la destination primaire du parent doit rester évidente.
- `Players database + searchable picker + auto-validation`
  - Très grosse amélioration fonctionnelle. Les pronostics buteurs deviennent crédibles.
  - Risque : sans états vides et aides contextuelles, les combobox joueurs peuvent sembler lourdes.
- `Buy-in paywall`, `social_stripe_hermes`, `simple_points_scoring`
  - Le modèle produit est plus complet : paiement, cagnotte, news, scoring.
  - Risque : les pages argent / paiement / cagnotte doivent être les plus sobres, rassurantes et explicites du produit.

Conclusion : Claude a bien renforcé la logique produit. La prochaine passe doit surtout rendre cette logique évidente visuellement, avec une structure de page répétable, des assets premium, et des workflows moins denses.

## 2. Pack d'assets produit à intégrer

Nouveau dossier :

`public/assets/lucarne/claude-pack-20260525/`

Chaque asset existe en SVG et PNG.

| Asset | Usage recommandé |
| --- | --- |
| `01-dashboard-today-command` | dashboard hero / TodayPanel premium |
| `02-predict-groups-board` | page `/predict`, onglet groupes |
| `03-knockout-scenario-tree` | page `/predict`, onglet finale |
| `04-live-match-center` | page `/live` |
| `05-news-hermes-feed` | page `/news` |
| `06-private-league-room` | page `/leagues` et détail ligue |
| `07-buy-in-gold-seat` | page `/buy-in` |
| `08-mobile-quick-bet` | onboarding mobile / FAB pari rapide |
| `09-admin-ops-panel` | pages admin |
| `10-wallet-prize-pool` | wallet, cagnotte, leaderboard payouts |

Instructions d'intégration :

1. Utiliser les SVG dans l'app :
   - `src="/assets/lucarne/claude-pack-20260525/svg/01-dashboard-today-command.svg"`
2. Utiliser les PNG uniquement pour :
   - Open Graph
   - docs externes
   - fallback social
3. Ne pas mettre les images dans des cartes décoratives imbriquées.
4. Les utiliser comme visuel de section ou empty-state, pas comme simple fond flou.

Exemple :

```tsx
<Image
  src="/assets/lucarne/claude-pack-20260525/svg/02-predict-groups-board.svg"
  alt=""
  width={1600}
  height={1000}
  className="h-auto w-full rounded-[8px] border border-white/[0.1]"
/>
```

## 3. Recommandation design principale

Créer un système commun de page pour toutes les routes connectées.

### Instruction à Claude

Créer ces composants :

- `src/components/layout/app-page-shell.tsx`
- `src/components/layout/page-hero.tsx`
- `src/components/layout/page-tabs.tsx`
- `src/components/layout/section-panel.tsx`
- `src/components/layout/empty-state-visual.tsx`

Objectif :

Chaque page doit suivre la même grammaire :

1. Hero compact avec kicker, titre, description, actions, stats.
2. Asset visuel optionnel à droite ou en dessous sur mobile.
3. Barre d'onglets/filtres si nécessaire.
4. Surface principale de travail.
5. Colonne ou bande secondaire pour insight / aide / état.

Contraintes design :

- Radius standard : `rounded-[8px]`, sauf téléphone/modal spéciale.
- Pas de cards dans des cards.
- Pas d'emoji pour icône/logo.
- Utiliser lucide ou les assets Lucarne.
- Garder la palette : abyss, primary green, gold, violet en accent seulement.
- Le texte dans les boutons doit rester court et ne jamais wrapper bizarrement.

## 4. Recommandation structure par onglet/page

### Dashboard `/dashboard`

But : "Qu'est-ce que je dois faire maintenant ?"

Instruction :

- Garder `TodayPanel`, mais lui redonner une identité premium.
- Ajouter `01-dashboard-today-command.svg` dans le hero ou comme empty visual si peu d'activité.
- Structure recommandée :
  - Hero : statut tournoi + countdown + buy-in status.
  - TodayPanel : live/prochain match + CTA principal.
  - Next actions : "Faire mon scénario", "Pronostiquer les matchs", "Voir classement".
  - Activity strip : derniers tickets, ligues, rang.
- Ne pas recréer l'ancien cockpit complet, mais réintroduire un panneau visuel plus ambitieux.

### Tournoi `/predict`

But : faire ses pronostics sans se perdre.

Instruction :

- Transformer la page en workflow progressif.
- Ajouter une barre sticky :
  - Groupes complétés
  - Matchs pronostiqués
  - Phase finale complétée
  - Champion choisi
- Onglet `Groupes` :
  - utiliser `02-predict-groups-board.svg` en aide ou empty-state.
  - afficher les groupes en accordéons par groupe.
  - chaque groupe doit montrer un résumé : `4 équipes classées`, `6 matchs`, `x pronos faits`.
- Onglet `Phase finale` :
  - utiliser `03-knockout-scenario-tree.svg`.
  - afficher le champion en sticky summary.
  - proposer "Réinitialiser depuis les groupes" uniquement avec confirmation.

### Matchs `/matches`

But : explorer le calendrier réel.

Instruction :

- Garder les vues Groupes / Calendrier / Phase finale.
- Ajouter un filtre compact :
  - équipe
  - ville/stade
  - groupe
  - statut prono : pas commencé / commencé / complet
- Chaque `MatchCard` doit exposer :
  - ville/stade
  - état du verrouillage
  - état de mes pronos
  - CTA rapide.
- Harmoniser les blasons : éviter un mélange Flag / TeamEmblem dans les surfaces premium.

### Live `/live`

But : suivre l'actualité du tournoi.

Instruction :

- Utiliser `04-live-match-center.svg` dans le hero ou empty-state.
- Fusionner visuellement `Scores` et `Actus` :
  - scores au centre
  - rail news à droite desktop
  - tabs seulement sur mobile si l'espace manque.
- Ajouter un indicateur de fraîcheur :
  - "Mis à jour il y a x min"
  - source Hermes / FIFA / manuel admin.

### News `/news`

But : rendre le fil Hermes plus éditorial.

Instruction :

- Utiliser `05-news-hermes-feed.svg` dans l'état vide.
- Ajouter filtres par type :
  - Actu
  - Annonce
  - Résumé
  - Mise à jour app
- Les posts doivent avoir un style de lecture plus éditorial :
  - titre
  - source
  - date
  - badge
  - extrait / corps
  - lien si disponible.

### Communauté `/leaderboard`, `/leagues`, `/bets`

But : comprendre où je me situe et avec qui je joue.

Instruction :

- `/leaderboard/global` :
  - intégrer `10-wallet-prize-pool.svg` près de la cagnotte projetée.
  - afficher les règles de payout clairement.
- `/leagues` :
  - intégrer `06-private-league-room.svg`.
  - distinguer "Mes ligues" et "Découvrir / rejoindre".
  - ajouter état vide avec CTA inviter/créer.
- `/bets` :
  - structurer par `À compléter`, `Validés`, `Réglés`, `Historique`.
  - garder les tickets scannables, mais ajouter un résumé de points possibles.

### Buy-in `/buy-in` et Wallet `/profile/wallet`

But : rassurer.

Instruction :

- Utiliser `07-buy-in-gold-seat.svg` pour `/buy-in`.
- Utiliser `10-wallet-prize-pool.svg` pour wallet/cagnotte.
- Clarifier :
  - contribution unique
  - pas de mise par pari
  - délai de verrouillage
  - top 3 payout
  - statut Stripe.
- Ajouter une timeline simple : `Payer -> Pronostiquer -> Suivre -> Podium`.

### Admin

But : donner un vrai poste de contrôle.

Instruction :

- Utiliser `09-admin-ops-panel.svg` sur la landing admin.
- Créer une page admin index qui résume :
  - paiements en attente
  - utilisateurs
  - joueurs
  - économie
  - news Hermes
  - derniers jobs cron.
- Garder les pages spécialisées, mais avec une navigation admin stable.

### Mobile

But : rendre l'app jouable au téléphone.

Instruction :

- Utiliser `08-mobile-quick-bet.svg` dans l'onboarding.
- Vérifier toutes les pages à 390px :
  - pas d'overflow horizontal
  - CTA visible sans scroll excessif
  - FAB ne masque pas les boutons principaux
  - dropdown nav accessible au clavier/touch.

## 5. Autres améliorations recommandées

### Données et transparence

- Ajouter un composant `DataSourceBadge`.
- Afficher clairement :
  - calendrier FIFA
  - dernière synchro
  - source Hermes
  - roster final attendu / importé.

### Tests

Ajouter ou renforcer :

- tests pour redirect `/picks` -> `/predict?tab=groupes`
- tests pour redirect `/bracket` -> `/predict?tab=finale`
- tests lock `1h before kickoff`
- tests `can_bet` / buy-in
- tests `resolve-bracket`
- tests payload scorer/player_id.

### Accessibilité

- Les dropdowns nav doivent gérer :
  - Escape
  - click outside
  - focus visible
  - aria menu/menuitem si le pattern reste menu.
- Les boutons de pronostic doivent avoir un état sélectionné accessible.

### Performance

- Utiliser SVG pour les assets in-app.
- Ajouter `sizes` précis pour chaque `Image`.
- Éviter de charger `listMatches()` sur des pages qui ne rendent qu'un sous-ensemble si une query filtrée suffit.

### Contenu

- Remplacer les aides génériques par des microcopies orientées action :
  - "Commence par classer les groupes"
  - "Choisis ton champion"
  - "Il te reste 12 matchs à pronostiquer"
  - "Ce match se verrouille dans 1h"

## 6. Priorité d'exécution

1. Créer les composants layout communs.
2. Appliquer aux pages `/dashboard`, `/predict`, `/live`.
3. Intégrer les assets 01 à 05.
4. Refaire `/buy-in`, `/wallet`, `/leaderboard` avec les assets 07 et 10.
5. Refaire `/leagues` et admin avec les assets 06 et 09.
6. Passer sur mobile 390px et desktop 1440px avec screenshots.
7. Ajouter les tests critiques.
