-- Reveal predictions on public profiles once everything is locked (or to
-- admins, anytime).
--
-- Before the global lock the anti-copy gate stands: you only see a player's
-- pick on a match once that match has kicked off (or is settled), so nobody can
-- copy a strong player before the deadline. Once predictions_locked() is true,
-- every prediction is frozen — there is nothing left to copy — so it's safe to
-- reveal everyone's picks in full. Admins can always see (oversight).

create or replace function public.profile_recent_bets(
  p_username text,
  p_limit int default 8
)
returns table (
  bet_id uuid,
  match_id uuid,
  kickoff_at timestamptz,
  match_status text,
  bet_type text,
  result text,
  points int,
  payload jsonb,
  home_name_fr text,
  home_name_en text,
  home_iso text,
  home_fifa text,
  home_score int,
  away_name_fr text,
  away_name_en text,
  away_iso text,
  away_fifa text,
  away_score int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid := public.resolve_viewable_profile(p_username);
begin
  if v_target is null then
    return;
  end if;

  return query
  select
    b.id,
    b.match_id,
    m.kickoff_at,
    m.status::text,
    b.bet_type::text,
    b.result::text,
    b.points::int,
    b.payload,
    ht.name_fr, ht.name_en, ht.iso_code, ht.fifa_code, m.home_score::int,
    awt.name_fr, awt.name_en, awt.iso_code, awt.fifa_code, m.away_score::int
  from public.bets b
  left join ref.matches m on m.id = b.match_id
  left join ref.teams ht on ht.id = m.home_team_id
  left join ref.teams awt on awt.id = m.away_team_id
  where b.user_id = v_target
    and b.match_id is not null                     -- exclut le pari 'bracket'
    and b.status in ('validated', 'settled')
    and (
      auth.uid() = v_target                        -- son propre profil : tout
      or public.is_admin()                         -- admin : voit tout, toujours
      or public.predictions_locked()               -- verrou global : pronos gelés, révélation sûre
      or b.status = 'settled'                       -- réglé : match terminé, rien à copier
      or (                                          -- match commencé : anti-copie levée
        m.id is not null
        and (now() >= m.kickoff_at or m.status in ('live', 'finished'))
      )
    )
  order by coalesce(m.kickoff_at, b.submitted_at) desc
  limit greatest(p_limit, 1);
end;
$$;

notify pgrst, 'reload schema';
