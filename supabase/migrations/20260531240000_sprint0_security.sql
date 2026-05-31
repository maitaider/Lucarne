-- Sprint 0 — Sécurité
--
-- C-1 — Fermer la fuite de classement à `anon` (régression de C2).
-- C2 (migration 20260531120000) avait révoqué le SELECT des VUES mv_*_standings
-- à anon. Mais des RPC SECURITY DEFINER ajoutées ensuite (standings_filtered,
-- public_profile, profile_recent_bets, resolve_viewable_profile, league_feed)
-- héritent automatiquement d'un GRANT EXECUTE à anon via les default ACL Postgres,
-- ce qui rouvre exactement la fuite : un visiteur non authentifié peut appeler
-- standings_filtered(null,null) et récupérer le classement global complet
-- (vérifié en rôle `anon` sur la DB locale après seed → la ligne est renvoyée).
--
-- Ces RPC ne sont JAMAIS appelées par une page publique :
--   - standings_filtered     → /leaderboard/global (sous (app), authentifié)
--   - public_profile         → /u/[username]       (sous (app), authentifié)
--   - profile_recent_bets    → /u/[username]       (sous (app), authentifié)
--   - resolve_viewable_profile (helper interne, gardé par auth.uid)
--   - league_feed            → mur de ligue        (sous (app), gardé par auth.uid)
-- On retire donc le droit d'exécution à anon. `shared_prediction` reste PUBLIC
-- par conception (page /p/[betId]) et n'est volontairement pas touchée ici.

revoke all on function public.standings_filtered(text, integer) from anon;
revoke all on function public.public_profile(text) from anon;
revoke all on function public.profile_recent_bets(text, integer) from anon;
revoke all on function public.resolve_viewable_profile(text) from anon;
revoke all on function public.league_feed(uuid, integer) from anon;

-- C-2 — La suppression de commentaire échouait silencieusement.
-- `deleteComment` (src/lib/social/actions.ts) faisait un UPDATE direct
-- (set deleted_at) en tant qu'`authenticated`. Deux problèmes :
--   1. aucune policy UPDATE n'existait → l'UPDATE touchait 0 ligne SANS erreur
--      (l'action renvoyait { ok: true } alors que rien n'était supprimé) ;
--   2. même AVEC une policy UPDATE, Postgres applique la policy SELECT
--      (`comments_select_all` USING deleted_at IS NULL) à la NOUVELLE ligne lors
--      d'un UPDATE : passer deleted_at à non-NULL la rend invisible →
--      "new row violates row-level security policy" (vérifié en local). Le
--      soft-delete par UPDATE direct est donc structurellement incompatible
--      avec cette policy SELECT.
-- Solution conforme aux conventions du projet (écritures contrôlées via RPC
-- SECURITY DEFINER) : delete_comment vérifie l'auteur (ou un admin) et
-- soft-delete en contournant la RLS. deleteComment() appelle désormais ce RPC.

create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner uuid;
  v_role app_role;
begin
  select user_id into v_owner from public.comments where id = p_comment_id;
  if v_owner is null then return; end if; -- déjà supprimé / inexistant : no-op
  select role into v_role from public.profiles where id = auth.uid();
  if auth.uid() <> v_owner
     and coalesce(v_role, 'player'::app_role) not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;
  update public.comments
     set deleted_at = now()
   where id = p_comment_id and deleted_at is null;
end;
$function$;

revoke all on function public.delete_comment(uuid) from public;
grant execute on function public.delete_comment(uuid) to authenticated;
