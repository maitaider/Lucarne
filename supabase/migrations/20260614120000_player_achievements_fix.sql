-- Fix « Ta saison » : exact_count comptait `bet_type = 'exact_score'`, or TOUS les
-- paris sont de ce type (système score-only) → exact_count == won_count (ex. @mehdi
-- voyait « 8 scores exacts » alors qu'un seul score était réellement exact).
--
-- Correction :
--   * exact_count = score RÉELLEMENT exact (payload home/away == score final).
--   * + winner_count (NOUVEAU) = bon vainqueur/issue (même signe d'écart, nul inclus)
--     → la vraie « victoire » de prono (won_count restant = a marqué ≥1 pt, conservé
--     pour le badge « Bons pronos »).
-- Nécessite un join sur ref.matches (scores finaux). Signature modifiée → drop+create.

drop function if exists public.player_achievements(text);

create function public.player_achievements(p_username text)
returns table (
  total_points int,
  settled_count int,
  won_count int,          -- a marqué ≥1 pt (résultat 'won')
  exact_count int,        -- score réellement exact (payload == score final)
  scorer_count int,       -- buteurs devinés (legacy, 0 en score-only)
  current_streak int,     -- série de pronos qui marquent, en cours
  best_streak int,        -- meilleure série
  winner_count int        -- bon vainqueur/issue (1X2) — la vraie « victoire »
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
    coalesce(sum(b.points), 0)::int,
    count(*)::int,
    count(*) filter (where b.result = 'won')::int,
    count(*) filter (
      where (b.payload->>'home')::int = m.home_score
        and (b.payload->>'away')::int = m.away_score
    )::int,
    count(*) filter (
      where b.result = 'won' and b.bet_type in ('first_scorer', 'anytime_scorer')
    )::int,
    v_cur,
    v_best,
    count(*) filter (
      where sign((b.payload->>'home')::int - (b.payload->>'away')::int)
          = sign(m.home_score - m.away_score)
    )::int
  from public.bets b
  join ref.matches m on m.id = b.match_id
  where b.user_id = v_uid and b.status = 'settled';
end;
$function$;

revoke all on function public.player_achievements(text) from public;
grant execute on function public.player_achievements(text) to authenticated;

notify pgrst, 'reload schema';
