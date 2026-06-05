-- Consensus du groupe par match : répartition agrégée vainqueur domicile / nul /
-- extérieur, sur TOUS les paris actifs (pas seulement ceux du caller).
--
-- Pourquoi une RPC SECURITY DEFINER et pas une lecture directe de `bets` :
--   1. La RLS anti-copie sur bets.SELECT ne laisse voir au joueur que SES paris
--      (+ ceux des co-membres APRÈS le coup d'envoi). Une agrégation côté client
--      ne « verrait » donc que son propre pari → consensus faux/vide.
--   2. Depuis le pivot score-only, les joueurs posent des `exact_score`, pas des
--      `match_winner` (un trigger supprime même winner/total). Il faut donc
--      DÉRIVER le vainqueur du score exact, sinon le consensus est toujours vide.
--
-- La fonction ne retourne QUE des compteurs agrégés (home/draw/away/total) — il
-- est impossible d'en déduire le pari d'un individu. Sûr à exposer avant le
-- coup d'envoi (≠ `match_predictions` qui révèle les pronos nominatifs et reste
-- donc gardée post-kickoff). Le seuil d'affichage (anti-inférence sur petit
-- échantillon) est géré côté UI.
create or replace function public.match_consensus(p_match_ids uuid[])
returns table(match_id uuid, home int, draw int, away int, total int)
language sql
stable
security definer
set search_path to 'public'
as $func$
  select
    w.match_id,
    count(*) filter (where w.pick = 'home')::int,
    count(*) filter (where w.pick = 'draw')::int,
    count(*) filter (where w.pick = 'away')::int,
    count(*)::int
  from (
    select
      b.match_id,
      case
        when b.bet_type = 'match_winner' then b.payload->>'winner'
        when (b.payload->>'home') is null or (b.payload->>'away') is null then null
        when (b.payload->>'home')::int > (b.payload->>'away')::int then 'home'
        when (b.payload->>'home')::int < (b.payload->>'away')::int then 'away'
        else 'draw'
      end as pick
    from public.bets b
    where b.match_id = any(p_match_ids)
      and b.bet_type in ('match_winner', 'exact_score')
      and b.status in ('validated', 'settled')
  ) w
  where auth.uid() is not null
    and w.pick in ('home', 'draw', 'away')
  group by w.match_id;
$func$;

revoke all on function public.match_consensus(uuid[]) from anon, public;
grant execute on function public.match_consensus(uuid[]) to authenticated;
