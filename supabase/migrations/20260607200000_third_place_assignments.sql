-- Persiste les affectations de repêchage (3es qualifiés → slots R32). Sans ça,
-- le choix du joueur (dropdowns « 3e A/C/D/F ») ne vivait qu'en mémoire client
-- et disparaissait au rafraîchissement. On ajoute une colonne jsonb et on la
-- sauvegarde via upsert_tournament_prediction.

alter table public.tournament_predictions
  add column if not exists third_place_assignments jsonb not null default '{}'::jsonb;

-- Remplace la RPC (4 args → 5 args). On DROP d'abord pour éviter une surcharge
-- ambiguë (l'ancienne 4-args et la nouvelle 5-args coexisteraient sinon).
drop function if exists public.upsert_tournament_prediction(jsonb, jsonb, uuid, uuid);

create or replace function public.upsert_tournament_prediction(
  p_group_standings jsonb,
  p_knockout_winners jsonb,
  p_champion_team_id uuid,
  p_top_scorer_player_id uuid default null,
  p_third_place_assignments jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_settings public.app_settings%rowtype;
  v_lock_at timestamptz;
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;

  select * into v_settings from public.app_settings where id = 1;
  v_lock_at := coalesce(
    v_settings.buy_in_deadline,
    v_settings.tournament_start_at - interval '1 hour'
  );
  if v_lock_at is not null and now() >= v_lock_at then
    raise exception 'bracket_locked';
  end if;

  insert into public.tournament_predictions (
    user_id, group_standings, knockout_winners,
    champion_team_id, top_scorer_player_id, third_place_assignments
  )
  values (
    v_uid,
    coalesce(p_group_standings, '{}'::jsonb),
    coalesce(p_knockout_winners, '{}'::jsonb),
    p_champion_team_id,
    p_top_scorer_player_id,
    coalesce(p_third_place_assignments, '{}'::jsonb)
  )
  on conflict (user_id) do update
     set group_standings         = excluded.group_standings,
         knockout_winners        = excluded.knockout_winners,
         champion_team_id        = excluded.champion_team_id,
         top_scorer_player_id    = excluded.top_scorer_player_id,
         third_place_assignments = excluded.third_place_assignments,
         updated_at              = now();
end;
$$;

revoke all on function public.upsert_tournament_prediction(jsonb, jsonb, uuid, uuid, jsonb) from public, anon;
grant execute on function public.upsert_tournament_prediction(jsonb, jsonb, uuid, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
