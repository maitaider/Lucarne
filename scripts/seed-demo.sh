#!/usr/bin/env bash
# Demo data seed for local development.
# Creates users via Supabase Auth Admin API, then leagues, bets, finished matches.
# Idempotent: re-running won't duplicate users (email conflict skipped).

set -euo pipefail

SUPA_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SECRET="${SUPABASE_SECRET:-sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz}"
DOCKER="${DOCKER_BIN:-/Applications/Docker.app/Contents/Resources/bin/docker}"
DB_CONTAINER="${DB_CONTAINER:-supabase_db_lucarne}"

declare -a USERS=(
  "alice@lucarne.local:Alice123!:alice:Alice Dupont"
  "bob@lucarne.local:Bob1234!:bob:Bob Martin"
  "carlos@lucarne.local:Carlos123!:carlos:Carlos Silva"
  "diana@lucarne.local:Diana123!:diana:Diana Müller"
  "erik@lucarne.local:Erik1234!:erik:Erik Andersson"
  "fatima@lucarne.local:Fatima123!:fatima:Fatima Diallo"
)

echo "→ Creating demo users…"
for U in "${USERS[@]}"; do
  IFS=':' read -r email password username display <<< "$U"
  RESP=$(curl -s -X POST "$SUPA_URL/auth/v1/admin/users" \
    -H "apikey: $SECRET" \
    -H "Authorization: Bearer $SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true,\"user_metadata\":{\"username\":\"$username\",\"display_name\":\"$display\",\"locale\":\"fr\"}}")
  if echo "$RESP" | grep -q '"id"'; then
    echo "  ✓ $username"
  elif echo "$RESP" | grep -q "already been registered\|email_exists"; then
    echo "  · $username (exists)"
  else
    echo "  ✗ $username: $RESP"
  fi
done

echo ""
echo "→ Running demo data SQL…"

"$DOCKER" exec -i "$DB_CONTAINER" psql -U postgres -d postgres <<'SQL'
begin;

-- =============================================================================
-- 1. Promote one demo user to admin (alice = co-admin)
-- =============================================================================
update public.profiles p
   set role = 'admin'
  from auth.users u
 where u.id = p.id and u.email = 'alice@lucarne.local';

-- =============================================================================
-- 2. Create demo leagues (idempotent)
-- =============================================================================
with admin_user as (
  select p.id from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'admin@lucarne.local'
)
insert into public.leagues (name, slug, description, owner_id, visibility, member_limit, allows_real_money)
select 'Lucarne FR', 'lucarne-fr', 'Ligue publique communautaire — tous les pronos du Mondial 2026.',
       (select id from admin_user), 'public', 100, false
where not exists (select 1 from public.leagues where slug = 'lucarne-fr');

with admin_user as (
  select p.id from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'admin@lucarne.local'
)
insert into public.leagues (name, slug, description, owner_id, visibility, member_limit, allows_real_money)
select 'Bureau friends', 'bureau-friends', 'Ligue privée entre potes — paiements IRL, validation admin.',
       (select id from admin_user), 'private', 20, true
where not exists (select 1 from public.leagues where slug = 'bureau-friends');

-- =============================================================================
-- 3. Add all demo users to "Lucarne FR" (public), admin owner already auto-added
-- =============================================================================
insert into public.league_members (league_id, user_id, role)
select l.id, p.id,
       case when u.email = 'admin@lucarne.local' then 'owner'::member_role else 'member'::member_role end
  from public.leagues l
 cross join public.profiles p
  join auth.users u on u.id = p.id
 where l.slug = 'lucarne-fr'
   and u.email in ('admin@lucarne.local','alice@lucarne.local','bob@lucarne.local',
                   'carlos@lucarne.local','diana@lucarne.local','erik@lucarne.local','fatima@lucarne.local')
on conflict (league_id, user_id) do nothing;

-- 4 users in "Bureau friends"
insert into public.league_members (league_id, user_id, role)
select l.id, p.id,
       case when u.email = 'admin@lucarne.local' then 'owner'::member_role
            when u.email = 'alice@lucarne.local' then 'admin'::member_role
            else 'member'::member_role end
  from public.leagues l
 cross join public.profiles p
  join auth.users u on u.id = p.id
 where l.slug = 'bureau-friends'
   and u.email in ('admin@lucarne.local','alice@lucarne.local','bob@lucarne.local','carlos@lucarne.local')
on conflict (league_id, user_id) do nothing;

-- =============================================================================
-- 4. Place bets on first 8 matches (all users vary their predictions)
--    Use direct INSERT to bypass place_bet RPC (60s buffer would block past matches)
-- =============================================================================
with target_matches as (
  select id, match_number, kickoff_at, home_team_id, away_team_id
  from ref.matches
  order by match_number
  limit 8
),
demo_users as (
  select p.id, p.username, u.email
    from public.profiles p
    join auth.users u on u.id = p.id
   where u.email in ('admin@lucarne.local','alice@lucarne.local','bob@lucarne.local',
                     'carlos@lucarne.local','diana@lucarne.local','erik@lucarne.local','fatima@lucarne.local')
),
lucarne_fr as (
  select id from public.leagues where slug = 'lucarne-fr'
),
bet_rows as (
  -- Each user picks a winner with varying stake (50-300 jetons)
  select
    du.id as user_id,
    tm.id as match_id,
    (select id from lucarne_fr) as league_id,
    'match_winner'::bet_type_enum as bet_type,
    case (abs(hashtext(du.email || tm.id::text)) % 3)
      when 0 then jsonb_build_object('winner','home')
      when 1 then jsonb_build_object('winner','draw')
      else        jsonb_build_object('winner','away')
    end as payload,
    -- Stake between 50 and 300 jetons (5000-30000 cents)
    (5000 + (abs(hashtext(du.email || tm.id::text || 'stake')) % 26) * 1000)::bigint as stake_cents,
    1.0::numeric as odds,
    -- submitted_at: a few days before kickoff
    (tm.kickoff_at - interval '3 days') as submitted_at,
    tm.kickoff_at as locked_at
  from demo_users du
  cross join target_matches tm
)
insert into public.bets (user_id, match_id, league_id, bet_type, payload, stake_cents, odds, status, submitted_at, locked_at)
select user_id, match_id, league_id, bet_type, payload, stake_cents, odds, 'validated'::bet_status, submitted_at, locked_at
from bet_rows
on conflict do nothing;

-- =============================================================================
-- 5. Update transactions for bet stakes
--    (Normally done by place_bet RPC. Replicate here for seed.)
-- =============================================================================
insert into public.transactions (user_id, direction, amount_cents, reason, bet_id, league_id, balance_after_cents)
select
  b.user_id, 'debit'::transaction_direction, b.stake_cents, 'bet_stake'::transaction_reason,
  b.id, b.league_id, 0  -- balance_after recomputed by trigger
from public.bets b
join ref.matches m on m.id = b.match_id
where m.match_number <= 8
on conflict do nothing;

-- =============================================================================
-- 6. Mark first 6 matches as finished with scores → trigger settles bets
-- =============================================================================
update ref.matches set status = 'finished', home_score = 2, away_score = 1
  where match_number = 1 and status = 'scheduled';
update ref.matches set status = 'finished', home_score = 0, away_score = 0
  where match_number = 2 and status = 'scheduled';
update ref.matches set status = 'finished', home_score = 3, away_score = 2
  where match_number = 3 and status = 'scheduled';
update ref.matches set status = 'finished', home_score = 1, away_score = 2
  where match_number = 4 and status = 'scheduled';
update ref.matches set status = 'finished', home_score = 2, away_score = 0
  where match_number = 5 and status = 'scheduled';
update ref.matches set status = 'finished', home_score = 1, away_score = 1
  where match_number = 6 and status = 'scheduled';

-- Match #7 = live, #8 = scheduled (so dashboard has variety)
update ref.matches set status = 'live', home_score = 1, away_score = 0
  where match_number = 7 and status = 'scheduled';

-- =============================================================================
-- 7. Recompute balances for demo users (place_bet RPC was bypassed)
--    Start from 5000 jetons base so all users can afford their stakes.
-- =============================================================================
update public.profiles p
   set balance_cents = 500000
                       - coalesce((select sum(stake_cents) from public.bets where user_id = p.id), 0)
                       + coalesce((select sum(payout_cents) from public.bets where user_id = p.id and status = 'settled'), 0)
 where p.id in (select distinct user_id from public.bets);

-- =============================================================================
-- 8. Refresh materialized views (standings)
-- =============================================================================
refresh materialized view public.mv_league_standings;
refresh materialized view public.mv_global_standings;

commit;

-- =============================================================================
-- 8. Summary
-- =============================================================================
select 'users' as t, count(*) from public.profiles
union all
select 'leagues', count(*) from public.leagues
union all
select 'league_members', count(*) from public.league_members
union all
select 'bets', count(*) from public.bets
union all
select 'settled_bets', count(*) from public.bets where status = 'settled'
union all
select 'finished_matches', count(*) from ref.matches where status = 'finished'
union all
select 'transactions', count(*) from public.transactions;
SQL

echo ""
echo "✓ Demo data ready. Login credentials:"
echo "  admin@lucarne.local / Admin1234!  (super_admin)"
echo "  alice@lucarne.local / Alice123!   (admin)"
echo "  bob@lucarne.local   / Bob1234!"
echo "  carlos@lucarne.local / Carlos123!"
echo "  diana@lucarne.local / Diana123!"
echo "  erik@lucarne.local  / Erik1234!"
echo "  fatima@lucarne.local / Fatima123!"
