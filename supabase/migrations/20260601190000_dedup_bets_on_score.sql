-- =============================================================================
-- Une seule ligne par match : un prono de SCORE est autoritaire.
-- -----------------------------------------------------------------------------
-- Un joueur pouvait avoir 3 paris sur un même match (exact_score via /predict +
-- match_winner/total_goals via le quick-bet). Le scoring ne double-compte plus
-- (cf. #14, exact_score autoritaire) mais ça encombrait l'historique (3 lignes,
-- 2 à 0). On supprime désormais les paris vainqueur/total redondants dès qu'un
-- score est posé sur le match (trigger), + nettoyage des doublons existants.
-- =============================================================================

create or replace function public.bets_dedup_on_exact_score()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- exact_score (la grille de /predict) couvre déjà vainqueur + total + score
  -- exact → on retire les paris winner/total séparés du même match pour ce joueur.
  delete from public.bets
   where user_id = new.user_id
     and match_id = new.match_id
     and bet_type in ('match_winner', 'total_goals');
  return new;
end;
$function$;

drop trigger if exists bets_dedup_on_exact_score on public.bets;
create trigger bets_dedup_on_exact_score
  after insert or update on public.bets
  for each row
  when (new.bet_type = 'exact_score' and new.match_id is not null)
  execute function public.bets_dedup_on_exact_score();

-- Nettoyage one-time des doublons déjà créés (winner/total quand un exact_score
-- existe pour le même joueur+match). Ces lignes valaient 0 (neutralisées par
-- #14) → suppression sans impact sur points/classement.
delete from public.bets b
 where b.bet_type in ('match_winner', 'total_goals')
   and b.match_id is not null
   and exists (
     select 1 from public.bets e
     where e.user_id = b.user_id
       and e.match_id = b.match_id
       and e.bet_type = 'exact_score'
   );
