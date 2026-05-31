-- =============================================================================
-- Phase 3 item B (sous-lot 1) — émission des notifs sociales
-- =============================================================================
-- Trois déclencheurs cross-user (modèle `admin_reply_ticket` / `notify_bet_*`) :
--   1. réaction sur un prono (ou un commentaire) → notifie le propriétaire ;
--   2. commentaire dans un fil → notifie les commentateurs précédents (+ le
--      propriétaire du prono si le fil est un pari) ;
--   3. joueur dépassé au classement → notifie celui qui s'est fait doubler.
-- Tous SECURITY DEFINER : les insertions visent un autre `user_id` que l'acteur,
-- impossible sous la RLS de `notifications` côté appelant.
-- =============================================================================

-- --- 1. Réaction reçue --------------------------------------------------------
create or replace function public.notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_match uuid;
  v_actor text;
begin
  if new.target_type = 'bet' then
    select user_id, match_id into v_owner, v_match
      from public.bets where id = new.target_id;
  elsif new.target_type = 'comment' then
    select user_id into v_owner
      from public.comments where id = new.target_id;
  end if;

  -- No owner found, or a self-reaction → nothing to notify.
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;

  select username into v_actor from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, payload)
  values (
    v_owner, 'reaction_received'::notif_type,
    jsonb_build_object(
      'target_type', new.target_type,
      'target_id', new.target_id,
      'reaction', new.reaction,
      'actor_id', new.user_id,
      'actor', v_actor,
      'match_id', v_match
    )
  );
  return new;
end;
$$;

drop trigger if exists reactions_notify on public.reactions;
create trigger reactions_notify
  after insert on public.reactions
  for each row execute function public.notify_reaction();

-- --- 2. Commentaire reçu (réponse dans un fil) -------------------------------
create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_match uuid;
begin
  select username into v_actor from public.profiles where id = new.user_id;

  -- Link target: a match thread IS the match; a bet thread → the bet's match.
  if new.parent_type = 'match' then
    v_match := new.parent_id;
  elsif new.parent_type = 'bet' then
    select match_id into v_match from public.bets where id = new.parent_id;
  end if;

  -- Recipients = prior distinct commenters in this thread (a "reply" to them)
  -- + the bet owner when the thread is a bet, minus the new author.
  insert into public.notifications (user_id, type, payload)
  select distinct r.uid, 'comment_received'::notif_type,
         jsonb_build_object(
           'parent_type', new.parent_type,
           'parent_id', new.parent_id,
           'comment_id', new.id,
           'actor_id', new.user_id,
           'actor', v_actor,
           'preview', left(new.body, 80),
           'match_id', v_match
         )
  from (
    select c.user_id as uid
      from public.comments c
     where c.parent_type = new.parent_type
       and c.parent_id = new.parent_id
       and c.deleted_at is null
       and c.user_id <> new.user_id
    union
    select b.user_id as uid
      from public.bets b
     where new.parent_type = 'bet'
       and b.id = new.parent_id
       and b.user_id <> new.user_id
  ) r
  where r.uid is not null;

  return new;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_comment();

-- --- 3. Dépassement au classement -------------------------------------------
-- Snapshot des rangs entre deux re-scorings, pour diffuser « X t'a doublé ».
-- Table interne : seule la fonction definer ci-dessous y touche.
create table if not exists public.standings_snapshot (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rank int not null,
  total_points int not null,
  updated_at timestamptz not null default now()
);
alter table public.standings_snapshot enable row level security;
revoke all on table public.standings_snapshot from authenticated, anon;

create or replace function public.notify_standings_overtakes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Notify each player who DROPPED (rank number increased) about the rival who
  -- now sits just ahead and was previously behind. Inner-join on the snapshot ⇒
  -- the very first run (empty snapshot) notifies nobody.
  insert into public.notifications (user_id, type, payload)
  select
    d.user_id, 'league_position'::notif_type,
    jsonb_build_object(
      'old_rank', d.prev_rank,
      'new_rank', d.cur_rank,
      'by_user', o.user_id,
      'by_username', op.username
    )
  from (
    select c.user_id, s.rank as prev_rank, c.rank::int as cur_rank
    from public.mv_global_standings c
    join public.standings_snapshot s on s.user_id = c.user_id
    where c.rank > s.rank
  ) d
  join lateral (
    select c2.user_id
    from public.mv_global_standings c2
    join public.standings_snapshot s2 on s2.user_id = c2.user_id
    where s2.rank > d.prev_rank
      and c2.rank < d.cur_rank
    order by c2.rank desc
    limit 1
  ) o on true
  join public.profiles op on op.id = o.user_id;

  -- Refresh the baseline to current standings.
  insert into public.standings_snapshot (user_id, rank, total_points)
  select user_id, rank::int, total_points::int
  from public.mv_global_standings
  on conflict (user_id) do update
    set rank = excluded.rank,
        total_points = excluded.total_points,
        updated_at = now();
end;
$$;

-- Seed the baseline so the first post-deploy settle diffs against real ranks
-- (no retroactive spam).
insert into public.standings_snapshot (user_id, rank, total_points)
select user_id, rank::int, total_points::int
from public.mv_global_standings
on conflict (user_id) do nothing;

-- --- Hook the overtake check into the scoring chokepoint --------------------
-- admin_recompute_match runs after every admin settle/correction (and the cron
-- path via admin_set_match_result), so the standings are final when we diff.
-- (Body identical to 20260531170000 + the notify_standings_overtakes() call.)
create or replace function public.admin_recompute_match(p_match_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bet_id uuid;
  v_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  update public.bets
     set status = 'validated', result = null, points = 0, payout_cents = 0
   where match_id = p_match_id and status = 'settled';

  for v_bet_id in
    select id from public.bets
     where match_id = p_match_id and status = 'validated'
  loop
    perform public.compute_bet_points(v_bet_id);
    v_count := v_count + 1;
  end loop;

  -- Standings are now final for this match → emit "overtaken" notifs.
  perform public.notify_standings_overtakes();

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'admin_recompute_match', 'matches', p_match_id,
    jsonb_build_object('recomputed_bets', v_count)
  );

  return v_count;
end;
$$;

revoke all on function public.admin_recompute_match(uuid) from public;
grant execute on function public.admin_recompute_match(uuid) to authenticated;

notify pgrst, 'reload schema';
