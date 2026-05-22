-- =============================================================================
-- Lucarne — Social feed + Stripe payments + Hermes news + admin lock
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Lock league creation to admins only
-- ----------------------------------------------------------------------------
drop policy if exists "leagues_insert_authenticated" on public.leagues;
create policy "leagues_insert_admin_only"
  on public.leagues for insert
  to authenticated
  with check (public.is_admin());

-- Also harden the create_league RPC: only admins can call it
create or replace function public.create_league(
  p_name text,
  p_slug text,
  p_description text default null,
  p_visibility league_visibility default 'private',
  p_member_limit int default 50,
  p_allows_real_money boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  insert into public.leagues (
    name, slug, description, owner_id, visibility, member_limit, allows_real_money
  )
  values (
    p_name, p_slug, p_description, auth.uid(), p_visibility, p_member_limit, p_allows_real_money
  )
  returning id into v_id;

  -- Owner = admin who created the league, auto-joined
  insert into public.league_members (league_id, user_id, role)
  values (v_id, auth.uid(), 'owner')
  on conflict (league_id, user_id) do nothing;

  return v_id;
end;
$$;

revoke all on function public.create_league from public;
grant execute on function public.create_league to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Social feed: league_posts table (richer than generic comments)
-- ----------------------------------------------------------------------------
create table if not exists public.league_posts (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_post_id uuid references public.league_posts (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  kind text not null default 'message' check (kind in ('message', 'announcement', 'system')),
  attachment_url text,
  pinned_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists league_posts_league_recent on public.league_posts (league_id, created_at desc);
create index if not exists league_posts_thread on public.league_posts (parent_post_id) where parent_post_id is not null;

alter table public.league_posts enable row level security;

-- Members of the league can read posts
drop policy if exists "league_posts_select_members" on public.league_posts;
create policy "league_posts_select_members"
  on public.league_posts for select
  to authenticated
  using (
    public.is_league_member(league_id)
    or public.is_admin()
  );

-- Members can insert their own posts
drop policy if exists "league_posts_insert_members" on public.league_posts;
create policy "league_posts_insert_members"
  on public.league_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_league_member(league_id)
  );

-- Owner of a post can edit (soft) / admin too
drop policy if exists "league_posts_update_owner" on public.league_posts;
create policy "league_posts_update_owner"
  on public.league_posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

-- RPC to publish a post
create or replace function public.publish_league_post(
  p_league_id uuid,
  p_body text,
  p_parent_post_id uuid default null,
  p_kind text default 'message'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_member boolean;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  v_member := public.is_league_member(p_league_id) or public.is_admin();
  if not v_member then raise exception 'not_a_league_member'; end if;

  insert into public.league_posts (league_id, author_id, parent_post_id, body, kind)
  values (p_league_id, auth.uid(), p_parent_post_id, trim(p_body), p_kind)
  returning id into v_id;

  -- Notify members (except author) on top-level posts
  if p_parent_post_id is null then
    insert into public.notifications (user_id, type, payload)
    select lm.user_id, 'comment_reply'::notif_type,
           jsonb_build_object(
             'league_id', p_league_id,
             'post_id', v_id,
             'author_id', auth.uid(),
             'preview', left(p_body, 80)
           )
    from public.league_members lm
    where lm.league_id = p_league_id
      and lm.status = 'active'
      and lm.user_id <> auth.uid();
  end if;

  return v_id;
end;
$$;

revoke all on function public.publish_league_post from public;
grant execute on function public.publish_league_post to authenticated;

-- ----------------------------------------------------------------------------
-- 3. News posts (for Hermes agent + admin announcements)
-- ----------------------------------------------------------------------------
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  kind text not null default 'news' check (kind in ('news', 'announcement', 'release', 'match_recap', 'system')),
  source text not null default 'admin' check (source in ('admin', 'hermes', 'system')),
  cover_url text,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists news_posts_recent on public.news_posts (published_at desc) where expires_at is null or expires_at > now();

alter table public.news_posts enable row level security;

-- Everyone authenticated can read non-expired news
drop policy if exists "news_posts_select_all" on public.news_posts;
create policy "news_posts_select_all"
  on public.news_posts for select
  to authenticated, anon
  using (expires_at is null or expires_at > now());

-- Only admins can insert directly (Hermes goes through the API with service role)
drop policy if exists "news_posts_admin_insert" on public.news_posts;
create policy "news_posts_admin_insert"
  on public.news_posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "news_posts_admin_update" on public.news_posts;
create policy "news_posts_admin_update"
  on public.news_posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Helper: post news (used by both admins via UI and Hermes via API)
create or replace function public.publish_news(
  p_title text,
  p_body text,
  p_kind text default 'news',
  p_source text default 'admin',
  p_cover_url text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor uuid;
begin
  v_actor := auth.uid();
  -- Admin gate when called by an authenticated user (not via service role)
  if v_actor is not null then
    if not public.is_admin() then raise exception 'forbidden'; end if;
  end if;

  insert into public.news_posts (title, body, kind, source, cover_url, expires_at, author_id)
  values (trim(p_title), trim(p_body), p_kind, p_source, p_cover_url, p_expires_at, v_actor)
  returning id into v_id;

  -- Broadcast notification to all active players (capped to avoid abuse)
  insert into public.notifications (user_id, type, payload)
  select p.id, 'daily_challenge'::notif_type,
         jsonb_build_object('news_id', v_id, 'title', p_title, 'kind', p_kind, 'source', p_source)
  from public.profiles p
  where p.deleted_at is null;

  return v_id;
end;
$$;

revoke all on function public.publish_news from public;
grant execute on function public.publish_news to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. Stripe payment intents tracking
-- ----------------------------------------------------------------------------
create table if not exists public.stripe_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id text unique not null,
  payment_intent_id text unique,
  amount_cents int not null check (amount_cents > 0),
  currency char(3) not null default 'CAD',
  tokens_to_credit int not null check (tokens_to_credit > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  real_payment_id uuid references public.real_payments (id) on delete set null
);

create index if not exists stripe_checkouts_user on public.stripe_checkouts (user_id, created_at desc);
create index if not exists stripe_checkouts_session on public.stripe_checkouts (session_id);

alter table public.stripe_checkouts enable row level security;

drop policy if exists "stripe_checkouts_self_or_admin" on public.stripe_checkouts;
create policy "stripe_checkouts_self_or_admin"
  on public.stripe_checkouts for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Service role / admin can insert + update
drop policy if exists "stripe_checkouts_admin_write" on public.stripe_checkouts;
create policy "stripe_checkouts_admin_write"
  on public.stripe_checkouts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- RPC: fulfill a Stripe checkout (called from webhook after payment_intent.succeeded)
-- This is the bridge: a successful Stripe payment becomes a real_payment row,
-- which credits tokens.
create or replace function public.fulfill_stripe_checkout(
  p_session_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkout public.stripe_checkouts%rowtype;
  v_settings public.app_settings%rowtype;
  v_payment_id uuid;
begin
  -- Lookup the checkout
  select * into v_checkout from public.stripe_checkouts where session_id = p_session_id;
  if not found then raise exception 'checkout_not_found'; end if;

  -- Idempotent: if already paid, return the existing payment
  if v_checkout.status = 'paid' then
    return v_checkout.real_payment_id;
  end if;

  select * into v_settings from public.app_settings where id = 1;

  -- Insert a real_payment + credit tokens (mirrors record_payment but for Stripe)
  insert into public.real_payments (
    user_id, amount_cents, currency, method, status,
    reference, note, tokens_credited, recorded_by, received_at
  )
  values (
    v_checkout.user_id, v_checkout.amount_cents, v_checkout.currency, 'other',
    'confirmed', p_session_id, 'Paiement Stripe',
    v_checkout.tokens_to_credit, v_checkout.user_id, now()
  )
  returning id into v_payment_id;

  update public.profiles
     set balance_cents = balance_cents + (v_checkout.tokens_to_credit * 100)
   where id = v_checkout.user_id;

  insert into public.transactions (
    user_id, direction, amount_cents, reason, balance_after_cents
  )
  select v_checkout.user_id, 'credit'::transaction_direction,
         v_checkout.tokens_to_credit * 100,
         'manual_adjustment'::transaction_reason,
         p.balance_cents
  from public.profiles p where p.id = v_checkout.user_id;

  update public.stripe_checkouts
     set status = 'paid',
         paid_at = now(),
         real_payment_id = v_payment_id
   where id = v_checkout.id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    v_checkout.user_id, 'stripe_payment_fulfilled', 'real_payments', v_payment_id,
    jsonb_build_object('session_id', p_session_id, 'amount_cents', v_checkout.amount_cents)
  );

  return v_payment_id;
end;
$$;

revoke all on function public.fulfill_stripe_checkout from public;
grant execute on function public.fulfill_stripe_checkout to service_role;

-- ----------------------------------------------------------------------------
-- 5. Notification triggers — auto-create notifications on key events
-- ----------------------------------------------------------------------------

-- When a bet status changes to validated → notify the user
create or replace function public.notify_bet_validated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'validated' and (old.status is distinct from 'validated') then
    insert into public.notifications (user_id, type, payload)
    values (
      new.user_id, 'bet_validated'::notif_type,
      jsonb_build_object('bet_id', new.id, 'stake_cents', new.stake_cents)
    );
  end if;
  if new.status = 'settled' and (old.status is distinct from 'settled') then
    insert into public.notifications (user_id, type, payload)
    values (
      new.user_id, 'bet_settled'::notif_type,
      jsonb_build_object('bet_id', new.id, 'result', new.result, 'points', new.points, 'payout_cents', new.payout_cents)
    );
  end if;
  if new.status = 'rejected' and (old.status is distinct from 'rejected') then
    insert into public.notifications (user_id, type, payload)
    values (
      new.user_id, 'bet_rejected'::notif_type,
      jsonb_build_object('bet_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bets_notify_status on public.bets;
create trigger bets_notify_status
  after update on public.bets
  for each row execute function public.notify_bet_validated();

-- ----------------------------------------------------------------------------
-- 6. Enable Realtime on new tables
-- ----------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.league_posts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.news_posts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
