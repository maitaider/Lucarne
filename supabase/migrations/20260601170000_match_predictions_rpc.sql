-- =============================================================================
-- Voir les pronostics des autres joueurs — APRÈS le coup d'envoi seulement.
-- -----------------------------------------------------------------------------
-- Les pronos /predict ont league_id = null → la RLS bets_select_visible ne les
-- montre qu'au propriétaire. Pour permettre aux joueurs de voir les pronos des
-- autres (et vice versa) SANS casser l'anti-triche, on expose une RPC SECURITY
-- DEFINER gardée par le coup d'envoi : tant que le match n'a pas démarré, elle
-- ne renvoie RIEN (personne ne peut copier). Une fois `now() >= kickoff_at`, on
-- renvoie le pronostic de score de chaque joueur. Réservé aux membres connectés.
-- =============================================================================

create or replace function public.match_predictions(p_match_id uuid)
returns table(
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  role text,
  pred_home int,
  pred_away int,
  status text,
  result text,
  points int
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    b.user_id,
    p.username::text,
    p.display_name,
    p.avatar_url,
    p.role::text,
    (b.payload->>'home')::int as pred_home,
    (b.payload->>'away')::int as pred_away,
    b.status::text,
    b.result::text,
    b.points::int
  from public.bets b
  join public.profiles p on p.id = b.user_id and p.deleted_at is null
  join ref.matches m on m.id = b.match_id
  where b.match_id = p_match_id
    and b.bet_type = 'exact_score'
    and b.status in ('validated', 'settled')
    -- Membre connecté uniquement (jamais anon).
    and auth.uid() is not null
    -- ANTI-TRICHE : visible seulement une fois le match commencé.
    and now() >= m.kickoff_at
  order by b.points desc nulls last, p.username asc;
$function$;

revoke all on function public.match_predictions(uuid) from anon, public;
grant execute on function public.match_predictions(uuid) to authenticated;
