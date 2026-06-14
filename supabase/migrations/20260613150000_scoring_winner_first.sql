-- Barème « vainqueur d'abord » (décision humain 2026-06-13).
--
-- Avant : bon vainqueur +3, bon total de buts +5/+2, score exact +5 → le total
-- de buts pesait plus que le vainqueur (un prono à contre-sens pouvait battre un
-- bon vainqueur). Après : le vainqueur prime, le total devient un bonus mineur.
--   * bon vainqueur (1X2) ....... +5
--   * bon total de buts ......... +2 (exact) / +1 (à ±1)
--   * score exact (bonus) ....... +5
--   → max 12/match ; se tromper de vainqueur plafonne à +2.
-- Cumulatif sur un pronostic de score (bet_type = 'exact_score'), lu en direct
-- par compute_bet_points via app_settings.scoring_rules.

update public.app_settings
set scoring_rules = scoring_rules || jsonb_build_object(
  'match_winner', 5,
  'total_goals_exact', 2,
  'total_goals_close', 1,
  'exact_score', 5
)
where id = 1;

-- Re-score les matchs DÉJÀ joués avec le nouveau barème, pour que toutes les
-- rencontres suivent les mêmes règles. UPDATE direct + triggers user désactivés
-- → aucune notification « pari réglé »/dépassement ni dédup réémise. No-op sur
-- une base fraîche (aucun match 'finished').
alter table public.bets disable trigger user;

with scored as (
  select b.id,
    (
      -- bon vainqueur (même signe d'écart = même issue, nul inclus)
      (case when sign((b.payload->>'home')::int - (b.payload->>'away')::int)
               = sign(m.home_score - m.away_score) then 5 else 0 end)
      -- bon total de buts (exact +2, à ±1 +1)
      + (case
           when (b.payload->>'home')::int + (b.payload->>'away')::int
                = m.home_score + m.away_score then 2
           when abs(((b.payload->>'home')::int + (b.payload->>'away')::int)
                    - (m.home_score + m.away_score)) = 1 then 1
           else 0 end)
      -- score exact (+5)
      + (case when (b.payload->>'home')::int = m.home_score
                and (b.payload->>'away')::int = m.away_score then 5 else 0 end)
    ) as pts
  from public.bets b
  join ref.matches m on m.id = b.match_id
  where m.status = 'finished' and b.bet_type = 'exact_score'
)
update public.bets t
set points = scored.pts,
    result = (case when scored.pts > 0 then 'won' else 'lost' end)::bet_result
from scored
where t.id = scored.id;

alter table public.bets enable trigger user;
