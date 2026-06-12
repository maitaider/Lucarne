-- Moments de célébration : quand un prono d'un joueur lui rapporte des points,
-- on le fête (toast enrichi, confetti pour un score exact). Pour que ça ne se
-- rejoue pas (refresh, re-scoring) et reste sobre, on marque chaque gain « fêté »
-- une fois affiché.

-- Flag par prono : NULL = gain pas encore fêté.
alter table public.bets
  add column if not exists celebrated_at timestamptz;

-- Index partiel : la requête de célébration ne regarde que les gains non fêtés.
create index if not exists bets_uncelebrated_idx
  on public.bets (user_id)
  where celebrated_at is null and result = 'won';

-- Réclame LA célébration la plus marquante non encore vue par l'appelant
-- (score exact prioritaire, sinon le plus de points, sinon le plus récent), et
-- marque TOUS ses gains non fêtés comme vus (une célébration couvre le lot →
-- sobriété : pas d'empilement). SECURITY DEFINER, filtré à auth.uid().
create or replace function public.claim_celebration()
returns table (
  bet_id uuid,
  match_id uuid,
  points int,
  is_exact boolean,
  home_fr text,
  home_en text,
  home_code text,
  away_fr text,
  away_en text,
  away_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  return query
  with wins as (
    select
      b.id,
      b.match_id,
      b.points,
      (
        b.bet_type = 'exact_score'
        and m.home_score is not null
        and m.away_score is not null
        and (b.payload->>'home')::int = m.home_score
        and (b.payload->>'away')::int = m.away_score
      ) as is_exact,
      th.name_fr as home_fr, th.name_en as home_en, th.fifa_code as home_code,
      ta.name_fr as away_fr, ta.name_en as away_en, ta.fifa_code as away_code,
      m.kickoff_at
    from public.bets b
    join ref.matches m on m.id = b.match_id
    left join ref.teams th on th.id = m.home_team_id
    left join ref.teams ta on ta.id = m.away_team_id
    where b.user_id = v_uid
      and b.status = 'settled'
      and b.result = 'won'
      and b.points > 0
      and b.celebrated_at is null
      and b.bet_type = 'exact_score'
  )
  select
    w.id, w.match_id, w.points, w.is_exact,
    w.home_fr, w.home_en, w.home_code, w.away_fr, w.away_en, w.away_code
  from wins w
  order by w.is_exact desc, w.points desc, w.kickoff_at desc
  limit 1;

  -- Marque tout le lot non fêté comme vu (la célébration unique le couvre).
  update public.bets
     set celebrated_at = now()
   where user_id = v_uid
     and status = 'settled'
     and result = 'won'
     and points > 0
     and celebrated_at is null;
end;
$$;

revoke all on function public.claim_celebration() from anon, public;
grant execute on function public.claim_celebration() to authenticated;

notify pgrst, 'reload schema';
