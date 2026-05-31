-- =============================================================================
-- Phase 3 item B (sous-lot 3) — partage public d'un prono
-- =============================================================================
-- Données d'un pronostic pour une page de partage PUBLIQUE (non authentifiée).
-- Anti-copie : ne révèle un prono QUE si le coup d'envoi est passé (ou, pour un
-- prono de tournoi sans match, si le tournoi a commencé). Avant ça, l'appel ne
-- renvoie rien → la page affiche « caché jusqu'au coup d'envoi ». Jamais
-- d'email ni de montant. Grant `anon` (page publique) + `authenticated`.
-- =============================================================================

create or replace function public.shared_prediction(p_bet_id uuid)
returns table (
  bet_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bet_type text,
  result text,
  points int,
  payload jsonb,
  status text,
  kickoff_at timestamptz,
  match_status text,
  home_name_fr text,
  home_name_en text,
  home_iso text,
  home_score int,
  away_name_fr text,
  away_name_en text,
  away_iso text,
  away_score int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    p.username::text,
    p.display_name,
    p.avatar_url,
    b.bet_type::text,
    b.result::text,
    b.points::int,
    b.payload,
    b.status::text,
    m.kickoff_at,
    m.status::text,
    ht.name_fr, ht.name_en, ht.iso_code, m.home_score::int,
    awt.name_fr, awt.name_en, awt.iso_code, m.away_score::int
  from public.bets b
  join public.profiles p on p.id = b.user_id and p.deleted_at is null
  left join ref.matches m on m.id = b.match_id
  left join ref.teams ht on ht.id = m.home_team_id
  left join ref.teams awt on awt.id = m.away_team_id
  where b.id = p_bet_id
    and b.status in ('validated', 'settled')
    and (
      (m.id is not null and now() >= m.kickoff_at)
      or (m.id is null and now() >= (select min(mm.kickoff_at) from ref.matches mm))
    );
$$;

revoke all on function public.shared_prediction(uuid) from public;
grant execute on function public.shared_prediction(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
