-- =============================================================================
-- Lucarne — Initial schema (Sprint 0)
-- =============================================================================
-- Schemas:
--   public  — domain (profiles, leagues, bets, ...)
--   ref     — reference data (teams, matches, players)
--   private — admin-only (bet_validations, audit_log)
--
-- Conventions:
--   * UUID v4 primary keys (gen_random_uuid)
--   * Postgres-native enums for statuses
--   * created_at / updated_at with trigger set_updated_at()
--   * Monetary amounts stored as bigint cents
--   * RLS enabled on every table; private schema not exposed via PostgREST
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- -----------------------------------------------------------------------------
-- Schemas
-- -----------------------------------------------------------------------------
create schema if not exists ref;
create schema if not exists private;

grant usage on schema public to anon, authenticated;
grant usage on schema ref to anon, authenticated;
revoke all on schema private from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type app_role as enum ('player', 'admin', 'super_admin');
create type league_visibility as enum ('private', 'public');
create type member_status as enum ('active', 'banned', 'left');
create type member_role as enum ('owner', 'admin', 'member');

create type confederation_enum as enum ('UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC');
create type match_stage as enum ('group', 'r32', 'r16', 'qf', 'sf', 'third_place', 'final');
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'cancelled');

create type bet_type_enum as enum (
  'match_winner', 'exact_score', 'first_scorer', 'anytime_scorer',
  'both_teams_score', 'over_under', 'tournament_winner', 'top_scorer',
  'bracket', 'golden_boot', 'golden_glove'
);
create type bet_status as enum (
  'draft', 'pending_payment', 'paid', 'validated', 'settled', 'rejected', 'refunded'
);
create type bet_result as enum ('won', 'lost', 'push', 'void');

create type validation_status as enum (
  'awaiting_payment', 'payment_received', 'validated', 'rejected'
);

create type prediction_type as enum (
  'bracket', 'tournament_winner', 'top_scorer', 'dark_horse', 'golden_boot'
);

create type reaction_enum as enum ('fire', 'clap', 'laugh', 'think', 'shock', 'skull');
create type notif_type as enum (
  'bet_validated', 'bet_rejected', 'bet_settled', 'match_kickoff',
  'match_goal', 'friend_request', 'league_invite', 'league_position',
  'comment_reply', 'daily_challenge'
);

create type transaction_direction as enum ('credit', 'debit');
create type transaction_reason as enum (
  'bet_stake', 'bet_payout', 'bet_refund', 'manual_adjustment',
  'league_entry', 'prize', 'signup_bonus', 'onboarding_quest'
);

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- Reference data (ref schema)
-- =============================================================================

create table ref.teams (
  id uuid primary key default gen_random_uuid(),
  fifa_code text unique not null check (char_length(fifa_code) = 3),
  name_fr text not null,
  name_en text not null,
  iso_code text,
  flag_emoji text,
  logo_url text,
  confederation confederation_enum not null,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teams_confederation_idx on ref.teams (confederation);
create trigger teams_set_updated_at before update on ref.teams
  for each row execute function public.set_updated_at();

create table ref.venues (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  city_fr text not null,
  city_en text not null,
  country text not null,
  capacity int,
  created_at timestamptz not null default now()
);

create table ref.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  stage match_stage not null,
  group_label char(1) check (group_label between 'A' and 'L'),
  match_number int unique,
  home_team_id uuid references ref.teams (id),
  away_team_id uuid references ref.teams (id),
  home_placeholder text,
  away_placeholder text,
  venue_id uuid references ref.venues (id),
  kickoff_at timestamptz not null,
  status match_status not null default 'scheduled',
  home_score smallint,
  away_score smallint,
  home_score_ht smallint,
  away_score_ht smallint,
  home_score_et smallint,
  away_score_et smallint,
  home_pen smallint,
  away_pen smallint,
  winner_team_id uuid references ref.teams (id),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index matches_kickoff_brin on ref.matches using brin (kickoff_at);
create index matches_stage_kickoff_idx on ref.matches (stage, kickoff_at);
create index matches_status_live_idx on ref.matches (status)
  where status in ('live', 'scheduled');
create trigger matches_set_updated_at before update on ref.matches
  for each row execute function public.set_updated_at();

create table ref.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references ref.matches (id) on delete cascade,
  minute smallint not null check (minute between 0 and 130),
  event_type text not null check (
    event_type in ('goal', 'own_goal', 'penalty_goal', 'red_card', 'yellow_card', 'substitution')
  ),
  player_name text,
  team_id uuid references ref.teams (id),
  external_event_id text unique,
  created_at timestamptz not null default now()
);
create index match_events_match_minute_idx on ref.match_events (match_id, minute);

create table ref.players (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  team_id uuid references ref.teams (id) on delete cascade,
  name text not null,
  position text,
  shirt_number smallint,
  created_at timestamptz not null default now()
);
create index players_team_name_idx on ref.players (team_id);
create index players_name_trgm_idx on ref.players using gin (name gin_trgm_ops);

-- =============================================================================
-- Public schema — users, leagues, bets
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext unique not null check (
    char_length(username) between 3 and 24
    and username ~ '^[a-zA-Z0-9_-]+$'
  ),
  display_name text,
  avatar_url text,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  timezone text not null default 'Europe/Paris',
  role app_role not null default 'player',
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  total_paid_cents bigint not null default 0,
  total_winnings_cents bigint not null default 0,
  transparency_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index profiles_role_idx on public.profiles (role) where role <> 'player';
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.scoring_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rules jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Default scoring profile "Classique Lucarne"
insert into public.scoring_profiles (name, rules, is_default) values (
  'Classique Lucarne',
  $${
    "match_winner": 3,
    "exact_score": 8,
    "goal_diff_correct": 5,
    "first_scorer": 5,
    "anytime_scorer_per": 2,
    "anytime_scorer_cap": 4,
    "both_teams_score": 2,
    "over_under": 2,
    "tournament_winner": 30,
    "tournament_runnerup": 15,
    "tournament_semifinalist": 8,
    "top_scorer": 20,
    "golden_glove": 15,
    "dark_horse": 10,
    "bracket": {"r32": 2, "r16": 4, "qf": 8, "sf": 15, "final": 25, "champion": 40},
    "risk_multiplier": {"threshold_odds": 2.5, "multiplier": 1.5, "cap": 2.0}
  }$$::jsonb,
  true
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 50),
  slug citext unique not null check (slug ~ '^[a-z0-9-]+$'),
  description text,
  cover_url text,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  visibility league_visibility not null default 'private',
  member_limit int not null default 50 check (member_limit between 2 and 500),
  entry_fee_cents bigint not null default 0,
  prize_pool_cents bigint not null default 0,
  scoring_profile_id uuid references public.scoring_profiles (id),
  allows_real_money boolean not null default false,
  requires_dual_validation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index leagues_owner_idx on public.leagues (owner_id);
create trigger leagues_set_updated_at before update on public.leagues
  for each row execute function public.set_updated_at();

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  status member_status not null default 'active',
  role member_role not null default 'member',
  primary key (league_id, user_id)
);
create index league_members_user_idx on public.league_members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  league_id uuid references public.leagues (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  max_uses int not null default 1 check (max_uses >= 1),
  uses int not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_code_idx on public.invitations using hash (code);
create index invitations_active_idx on public.invitations (league_id)
  where revoked_at is null and uses < max_uses;

create table public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  match_id uuid references ref.matches (id) on delete restrict,
  bet_type bet_type_enum not null,
  payload jsonb not null,
  stake_cents bigint not null check (stake_cents > 0 and stake_cents <= 100000),
  odds numeric(6, 3) not null default 1.0,
  status bet_status not null default 'pending_payment',
  submitted_at timestamptz not null default now(),
  locked_at timestamptz,
  result bet_result,
  payout_cents bigint not null default 0,
  points int not null default 0,
  client_request_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bets_user_league_idx on public.bets (user_id, league_id);
create index bets_match_validated_idx on public.bets (match_id, status)
  where status = 'validated';
create index bets_league_points_idx on public.bets (league_id, points desc);
create index bets_submitted_brin on public.bets using brin (submitted_at);
create trigger bets_set_updated_at before update on public.bets
  for each row execute function public.set_updated_at();

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  prediction_type prediction_type not null,
  payload jsonb not null,
  locked_at timestamptz,
  points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index predictions_user_type_idx on public.predictions (
  user_id, prediction_type, coalesce(league_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create trigger predictions_set_updated_at before update on public.predictions
  for each row execute function public.set_updated_at();

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_type text not null check (parent_type in ('match', 'bet', 'league_feed')),
  parent_id uuid not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index comments_parent_idx on public.comments (parent_type, parent_id, created_at desc);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('comment', 'bet')),
  target_id uuid not null,
  reaction reaction_enum not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, reaction)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type notif_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id)
  where read_at is null;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  direction transaction_direction not null,
  amount_cents bigint not null check (amount_cents > 0),
  reason transaction_reason not null,
  bet_id uuid references public.bets (id) on delete set null,
  league_id uuid references public.leagues (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  balance_after_cents bigint not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index transactions_user_created_idx on public.transactions (user_id, created_at desc);

-- =============================================================================
-- Private schema — admin workflow & audit
-- =============================================================================

create table private.bet_validations (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid unique not null references public.bets (id) on delete cascade,
  submitted_amount_cents bigint not null,
  payment_method text,
  payment_reference text,
  proof_url text,
  status validation_status not null default 'awaiting_payment',
  validated_by uuid references public.profiles (id),
  validated_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bet_validations_status_idx on private.bet_validations (status);
create trigger bet_validations_set_updated_at before update on private.bet_validations
  for each row execute function public.set_updated_at();

create table private.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on private.audit_log (entity_type, entity_id);
create index audit_log_actor_idx on private.audit_log (actor_id, created_at desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.invitations enable row level security;
alter table public.bets enable row level security;
alter table public.predictions enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.notifications enable row level security;
alter table public.transactions enable row level security;
alter table public.scoring_profiles enable row level security;
alter table ref.teams enable row level security;
alter table ref.venues enable row level security;
alter table ref.matches enable row level security;
alter table ref.match_events enable row level security;
alter table ref.players enable row level security;
alter table private.bet_validations enable row level security;
alter table private.audit_log enable row level security;

-- Helper: is current user admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

-- Profiles: public read for non-sensitive cols, self-update only
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (deleted_at is null);

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Reference data: world-readable for authenticated users
create policy "ref_teams_read" on ref.teams for select to authenticated using (true);
create policy "ref_venues_read" on ref.venues for select to authenticated using (true);
create policy "ref_matches_read" on ref.matches for select to authenticated using (true);
create policy "ref_match_events_read" on ref.match_events for select to authenticated using (true);
create policy "ref_players_read" on ref.players for select to authenticated using (true);

-- Scoring profiles: read-only
create policy "scoring_profiles_read"
  on public.scoring_profiles for select
  to authenticated using (true);

-- Leagues: visible if public or member or admin
create policy "leagues_select_visible"
  on public.leagues for select
  to authenticated
  using (
    visibility = 'public'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = leagues.id and lm.user_id = auth.uid() and lm.status = 'active'
    )
    or public.is_admin()
  );

create policy "leagues_insert_authenticated"
  on public.leagues for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "leagues_update_owner_or_admin"
  on public.leagues for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- League members: visible to other members of the same league
create policy "league_members_select"
  on public.league_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.league_members lm2
      where lm2.league_id = league_members.league_id
        and lm2.user_id = auth.uid()
        and lm2.status = 'active'
    )
    or public.is_admin()
  );

-- Invitations: creators and admins only
create policy "invitations_select_own_or_admin"
  on public.invitations for select
  to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Bets: critical anti-copy policy
create policy "bets_select_visible"
  on public.bets for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      league_id is not null
      and exists (
        select 1 from public.league_members lm
        where lm.league_id = bets.league_id
          and lm.user_id = auth.uid()
          and lm.status = 'active'
      )
      and (
        (
          bets.match_id is not null
          and exists (
            select 1 from ref.matches m
            where m.id = bets.match_id and now() >= m.kickoff_at
          )
        )
        or (
          bets.match_id is null
          and now() >= (select min(kickoff_at) from ref.matches)
        )
      )
    )
  );

-- INSERT only via RPC place_bet (no direct insert from client)
-- We DO NOT create an insert policy here — RPC uses security definer.

-- Predictions: similar to bets (self + post-lock visibility to league members)
create policy "predictions_select_visible"
  on public.predictions for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      locked_at is not null and now() >= locked_at
      and (
        league_id is null
        or exists (
          select 1 from public.league_members lm
          where lm.league_id = predictions.league_id
            and lm.user_id = auth.uid()
            and lm.status = 'active'
        )
      )
    )
  );

-- Comments: visible to all auth users (with parent visibility check enforced at app layer)
create policy "comments_select_all"
  on public.comments for select
  to authenticated
  using (deleted_at is null);

create policy "comments_insert_self"
  on public.comments for insert
  to authenticated
  with check (user_id = auth.uid());

-- Reactions
create policy "reactions_select_all"
  on public.reactions for select
  to authenticated using (true);

create policy "reactions_insert_self"
  on public.reactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "reactions_delete_self"
  on public.reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- Notifications: self only
create policy "notifications_select_self"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_self"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

-- Transactions: self only (append-only at app layer)
create policy "transactions_select_self"
  on public.transactions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Private schema: revoke all
revoke all on all tables in schema private from anon, authenticated;
revoke all on all sequences in schema private from anon, authenticated;
revoke all on all functions in schema private from anon, authenticated;

-- =============================================================================
-- RPC functions (server-side, SECURITY DEFINER)
-- =============================================================================

-- place_bet: the only path to insert a bet
create or replace function public.place_bet(
  p_league_id uuid,
  p_match_id uuid,
  p_bet_type bet_type_enum,
  p_payload jsonb,
  p_stake_cents bigint,
  p_client_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_kickoff timestamptz;
  v_bet_id uuid;
  v_existing uuid;
  v_balance bigint;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Idempotence: if a bet with this client_request_id exists, return it
  select id into v_existing from public.bets
   where client_request_id = p_client_request_id;
  if v_existing is not null then
    return v_existing;
  end if;

  -- Stake validation
  if p_stake_cents < 10 or p_stake_cents > 100000 then
    raise exception 'invalid_stake';
  end if;

  -- Match-bound bets: validate timing (60s buffer)
  if p_match_id is not null then
    select kickoff_at into v_kickoff from ref.matches where id = p_match_id;
    if v_kickoff is null then
      raise exception 'match_not_found';
    end if;
    if now() > v_kickoff - interval '60 seconds' then
      raise exception 'kickoff_too_close';
    end if;
  end if;

  -- League membership check
  if p_league_id is not null then
    if not exists (
      select 1 from public.league_members
      where league_id = p_league_id
        and user_id = v_user_id
        and status = 'active'
    ) then
      raise exception 'not_a_league_member';
    end if;
  end if;

  -- Insert bet
  insert into public.bets (
    user_id, league_id, match_id, bet_type, payload, stake_cents,
    status, submitted_at, locked_at, client_request_id
  ) values (
    v_user_id, p_league_id, p_match_id, p_bet_type, p_payload, p_stake_cents,
    'pending_payment', now(), v_kickoff, p_client_request_id
  ) returning id into v_bet_id;

  return v_bet_id;
end;
$$;

grant execute on function public.place_bet to authenticated;

-- redeem_invitation: validates an invitation code and joins league (or marks signup ok)
create or replace function public.redeem_invitation(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invitation from public.invitations
   where code = p_code
     and revoked_at is null
     and uses < max_uses
     and expires_at > now()
   for update;

  if v_invitation.id is null then
    raise exception 'invalid_or_expired_code';
  end if;

  update public.invitations
     set uses = uses + 1
   where id = v_invitation.id;

  -- If league-specific, add user as member
  if v_invitation.league_id is not null then
    insert into public.league_members (league_id, user_id, role)
    values (v_invitation.league_id, v_user_id, 'member')
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'invitation_id', v_invitation.id,
    'league_id', v_invitation.league_id
  );
end;
$$;

grant execute on function public.redeem_invitation to authenticated;

-- =============================================================================
-- Auto-create profile on signup (trigger on auth.users)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'display_name',
    coalesce(new.raw_user_meta_data->>'locale', 'fr')
  );

  -- Signup bonus: 1000 jetons
  insert into public.transactions (user_id, direction, amount_cents, reason, balance_after_cents)
  values (new.id, 'credit', 100000, 'signup_bonus', 100000);

  update public.profiles set balance_cents = 100000 where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
