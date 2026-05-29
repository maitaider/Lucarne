-- =============================================================================
-- Unlimited house league
-- -----------------------------------------------------------------------------
-- The house (private) league accepts an unlimited number of players. Paying is
-- gated separately by the buy-in (can_bet), so membership itself is uncapped.
-- member_limit NULL = no cap.
-- =============================================================================

alter table public.leagues alter column member_limit drop not null;
alter table public.leagues drop constraint if exists leagues_member_limit_check;
alter table public.leagues
  add constraint leagues_member_limit_check
  check (member_limit is null or member_limit >= 2);

-- Current house league: lift the cap.
update public.leagues set member_limit = null where is_default;

-- Future house leagues are created uncapped too (the first league becomes the
-- house league and gets no member limit).
create or replace function public.tg_ensure_default_league()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.leagues where is_default and deleted_at is null
  ) then
    new.is_default := true;
    new.member_limit := null; -- house league has no member cap
  end if;
  return new;
end;
$$;
