# Lucarne — Runbook administrateur

Ce runbook couvre l'opération quotidienne, les incidents et les procédures de récupération.

---

## 1. Démarrage rapide (admin du jour)

### Connexion admin

1. Connecte-toi sur `lucarne.app/fr/login`.
2. Si ton compte n'a pas le rôle `admin`, demande à un `super_admin` de te promouvoir via SQL :
   ```sql
   update public.profiles set role = 'admin' where username = 'mon_username';
   ```
3. Accède au panel : `lucarne.app/fr/admin/validations`.

### Tour matinal (5 minutes)

- File `/admin/validations` : valider les paris payés (deux clics : "Marquer payé" puis "Valider").
- File `/admin/audit` : passer en revue les actions de la veille.
- `/admin/matches` : vérifier qu'aucun match n'est en `scheduled` alors qu'il s'est déjà joué.

---

## 2. Workflow validation paris argent réel

```
draft → pending_payment → paid → validated → settled
                              ↘ rejected
                              ↘ refunded
```

### Étapes

1. **L'utilisateur déclare avoir payé** — le pari arrive avec status `pending_payment`.
2. **Admin reçoit l'argent IRL** (cash / Revolut / PayPal Friends / Lydia).
3. **Admin clique "Marquer payé"** dans `/admin/validations` → `payment_received`.
4. **Admin clique "Valider"** → `validated` (CAS-safe : refusé si l'état a changé entre-temps).
5. **Le settlement est automatique** après la fin du match (trigger Postgres).

### Garde-fous

- **Fenêtre** : impossible de valider à moins de 60s du coup d'envoi (auto-reject + refund).
- **Two-step obligatoire** : `marquer payé` ≠ `valider`. Une seule personne peut techniquement faire les deux, mais le plan recommande deux admins pour ligues >10 membres.
- **Audit trail** : toutes les actions admin sont loggées dans `private.audit_log`.

### Cas de rejet

Cliquer "Rejeter" exige une raison de **min 10 caractères** (validation côté DB). L'utilisateur reçoit une notification + email avec la raison.

---

## 3. Incidents fréquents

### "Le pari n'apparaît pas après création"

- Vérifier `bets.status` — doit être `pending_payment`.
- Vérifier RLS : un autre user ne devrait pas voir ce pari tant que le kickoff n'est pas atteint.
- Si bug persistant : SQL :
  ```sql
  select id, status, submitted_at, locked_at from public.bets
  where user_id = (select id from public.profiles where username = 'X')
  order by submitted_at desc limit 10;
  ```

### "Score erroné après le match"

- L'admin peut corriger via `/admin/matches/[id]` (à venir) ou via SQL :
  ```sql
  update ref.matches set home_score = X, away_score = Y where id = '...';
  ```
- Le trigger `matches_settle_on_finish` recalculera automatiquement les paris du match.

### "Match annulé"

```sql
update ref.matches set status = 'cancelled' where id = '...';
```

Puis remboursement manuel des paris du match :

```sql
update public.bets set status = 'refunded' where match_id = '...' and status in ('validated', 'paid');
-- Et créer les transactions de refund pour chaque pari
```

### "Utilisateur s'est trompé de pari"

Avant `validated` : utilisateur peut annuler depuis `/bets/[id]`.
Après `validated` : intervention admin obligatoire, créer un ticket de litige + rembourser manuellement avec audit trail.

---

## 4. Maintenance préventive

### Quotidien

- Backup automatique Supabase (chaque 24h, garde 7 jours en plan Pro).
- Vérifier Sentry : 0 erreur 500 inattendue.
- Quotas API-Football : reste ≥ 1500 req disponibles avant nuit.

### Hebdomadaire

- Refresh forcé des matérialisées :
  ```sql
  refresh materialized view concurrently public.mv_league_standings;
  refresh materialized view concurrently public.mv_global_standings;
  ```
- Audit log : exporter les 7 derniers jours pour archive (`select * from private.audit_log where created_at > now() - interval '7 days'`).

### Pre-kickoff (J-1)

- Vérifier que toutes les matchs de J+1 ont un `kickoff_at` correct.
- Vérifier que les rosters des équipes sont à jour pour les paris buteurs.
- Tester un pari de bout-en-bout avec un compte test.
- Confirmer que les 2-3 admins sont disponibles le jour J.

---

## 5. Procédure de restauration

### Snapshot Supabase

```bash
supabase db dump --linked --file backup-$(date +%Y%m%d).sql
```

### Restauration

```bash
psql "$DATABASE_URL" < backup-YYYYMMDD.sql
```

⚠️ Toujours tester sur l'environnement de staging avant prod.

---

## 6. Promotion / dégradation d'utilisateur

```sql
-- Promouvoir un user en admin
update public.profiles set role = 'admin' where username = 'X';

-- Rétrograder
update public.profiles set role = 'player' where username = 'X';
```

Toutes les actions sont auditées (trigger sur `profiles.role`).

---

## 7. Génération de codes d'invitation

Via UI : `/admin/...` ou `/leagues/[slug]/invite`.

Via SQL (batch) :

```sql
do $$
declare i int;
declare v_code text;
begin
  for i in 1..10 loop
    select code from public.generate_invitation(
      p_league_id := '<league-uuid>',
      p_expires_days := 14,
      p_max_uses := 1
    ) into v_code;
    raise notice 'Generated: %', v_code;
  end loop;
end $$;
```

---

## 8. Contacts d'astreinte

| Rôle | Personne | Joignable |
|---|---|---|
| Super admin | TBD | — |
| Admin secondaire | TBD | — |
| DBA / Infra | TBD | — |

À remplir avant le 11 juin 2026.
