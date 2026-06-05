-- Badges & séries — agrégats calculés à la volée depuis les paris RÉGLÉS d'un
-- joueur. SECURITY DEFINER : ne renvoie que des compteurs/points (pas de paris
-- bruts → aucune fuite anti-copie ; total_points est déjà public au classement).

create or replace function public.player_achievements(p_username text)
returns table (
  total_points int,
  settled_count int,
  won_count int,
  exact_count int,        -- « cartons pleins » : score exact deviné
  scorer_count int,       -- buteurs devinés (1er / à tout moment)
  current_streak int,     -- série de bons pronos en cours (les plus récents)
  best_streak int         -- meilleure série de bons pronos
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid;
  rec record;
  v_cur int := 0;
  v_best int := 0;
begin
  select id into v_uid from public.profiles
   where username = p_username and deleted_at is null;
  if v_uid is null then
    return;
  end if;

  -- Séries : parcourt les paris réglés dans l'ordre chronologique du match.
  for rec in
    select bt.result
    from public.bets bt
    left join ref.matches m on m.id = bt.match_id
    where bt.user_id = v_uid and bt.status = 'settled'
    order by coalesce(m.kickoff_at, bt.created_at)
  loop
    if rec.result = 'won' then
      v_cur := v_cur + 1;
      if v_cur > v_best then v_best := v_cur; end if;
    else
      v_cur := 0;
    end if;
  end loop;

  return query
  select
    coalesce(sum(points), 0)::int,
    count(*)::int,
    count(*) filter (where result = 'won')::int,
    count(*) filter (where result = 'won' and bet_type = 'exact_score')::int,
    count(*) filter (
      where result = 'won' and bet_type in ('first_scorer', 'anytime_scorer')
    )::int,
    v_cur,
    v_best
  from public.bets
  where user_id = v_uid and status = 'settled';
end;
$function$;

revoke all on function public.player_achievements(text) from public;
grant execute on function public.player_achievements(text) to authenticated;

notify pgrst, 'reload schema';
