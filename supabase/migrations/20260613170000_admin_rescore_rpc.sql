-- Admin self-service re-score: re-applies the CURRENT barème
-- (app_settings.scoring_rules) to every settled score-pick on a finished match.
-- Used by the admin "Barème" page after editing the point values.
--
-- Silent by design: it keeps status = 'settled' (only points/result change), so
-- the bets_notify_status trigger — which only fires on a status TRANSITION — does
-- NOT re-emit "bet settled" notifications. Standings are live views → no refresh.

create or replace function public.admin_rescore_all_matches()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rules jsonb;
  v_w int; v_te int; v_tc int; v_ex int; v_count int;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  select scoring_rules into v_rules from public.app_settings where id = 1;
  v_w  := coalesce((v_rules->>'match_winner')::int, 5);
  v_te := coalesce((v_rules->>'total_goals_exact')::int, 2);
  v_tc := coalesce((v_rules->>'total_goals_close')::int, 1);
  v_ex := coalesce((v_rules->>'exact_score')::int, 5);

  with scored as (
    select b.id,
      (
        -- bon vainqueur (même signe d'écart = même issue, nul inclus)
        (case when sign((b.payload->>'home')::int - (b.payload->>'away')::int)
                 = sign(m.home_score - m.away_score) then v_w else 0 end)
        -- bon total de buts (exact / à ±1)
        + (case
             when (b.payload->>'home')::int + (b.payload->>'away')::int
                  = m.home_score + m.away_score then v_te
             when abs(((b.payload->>'home')::int + (b.payload->>'away')::int)
                      - (m.home_score + m.away_score)) = 1 then v_tc
             else 0 end)
        -- score exact
        + (case when (b.payload->>'home')::int = m.home_score
                  and (b.payload->>'away')::int = m.away_score then v_ex else 0 end)
      ) as pts
    from public.bets b
    join ref.matches m on m.id = b.match_id
    where m.status = 'finished'
      and b.bet_type = 'exact_score'
      and b.status = 'settled'
  )
  update public.bets t
  set points = scored.pts,
      result = (case when scored.pts > 0 then 'won' else 'lost' end)::bet_result
  from scored
  where t.id = scored.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_rescore_all_matches() from anon, public;
grant execute on function public.admin_rescore_all_matches() to authenticated, service_role;

comment on function public.admin_rescore_all_matches() is
  'Re-score les paris de score des matchs terminés avec le barème courant. Garde status=settled → aucune notification réémise. Admin only (is_admin).';
