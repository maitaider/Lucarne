-- Salon — itération 5b : sondages.
-- Un sondage est rattaché à un message du Salon (comment global) : il apparaît
-- ainsi naturellement dans le fil + hérite de la modération (suppression, etc.).

create table if not exists public.chat_polls (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null unique references public.comments (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 200),
  options text[] not null check (
    array_length(options, 1) between 2 and 6
  ),
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_poll_votes (
  poll_id uuid not null references public.chat_polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_idx int not null check (option_idx >= 0),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
create index if not exists chat_poll_votes_poll_idx on public.chat_poll_votes (poll_id);

alter table public.chat_polls enable row level security;
alter table public.chat_poll_votes enable row level security;
-- Lecture : membres connectés (comme les messages).
drop policy if exists chat_polls_select on public.chat_polls;
create policy chat_polls_select on public.chat_polls
  for select to authenticated using (true);
drop policy if exists chat_poll_votes_select on public.chat_poll_votes;
create policy chat_poll_votes_select on public.chat_poll_votes
  for select to authenticated using (true);
grant select on public.chat_polls to authenticated;
grant select on public.chat_poll_votes to authenticated;
-- Écriture : via RPC SECURITY DEFINER uniquement.

-- Créer un sondage = un message Salon + le sondage (atomique). Le message
-- déclenche le BEFORE INSERT (throttle/mute) → un membre muet ne peut pas créer.
create or replace function public.create_chat_poll(
  p_question text,
  p_options text[],
  p_closes_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_q text := left(trim(coalesce(p_question, '')), 200);
  v_opts text[];
  v_comment_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if char_length(v_q) < 1 then raise exception 'bad_question'; end if;
  -- Nettoie les options (trim, retire les vides, cap 60 car), dédoublonne en
  -- PRÉSERVANT l'ordre saisi (min ordinalité), garde 2..6.
  select array_agg(o order by ord) into v_opts from (
    select min(ord) as ord, o
    from (
      select ord, left(trim(x), 60) as o
      from unnest(p_options) with ordinality as t(x, ord)
      where char_length(trim(x)) > 0
    ) y
    group by o
  ) z;
  if v_opts is null or array_length(v_opts, 1) < 2 or array_length(v_opts, 1) > 6 then
    raise exception 'bad_options';
  end if;

  insert into public.comments (user_id, parent_type, parent_id, body)
  values (v_uid, 'global', '00000000-0000-0000-0000-000000000000', v_q)
  returning id into v_comment_id;

  insert into public.chat_polls (comment_id, created_by, question, options, closes_at)
  values (v_comment_id, v_uid, v_q, v_opts, p_closes_at);

  return v_comment_id;
end;
$function$;
revoke all on function public.create_chat_poll(text, text[], timestamptz) from public;
grant execute on function public.create_chat_poll(text, text[], timestamptz) to authenticated;

-- Voter / changer son vote.
create or replace function public.vote_chat_poll(p_poll_id uuid, p_option_idx int)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_n int;
  v_closes timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select array_length(options, 1), closes_at into v_n, v_closes
    from public.chat_polls where id = p_poll_id;
  if v_n is null then raise exception 'not_found'; end if;
  if v_closes is not null and v_closes < now() then raise exception 'poll_closed'; end if;
  if p_option_idx < 0 or p_option_idx >= v_n then raise exception 'bad_option'; end if;
  insert into public.chat_poll_votes (poll_id, user_id, option_idx)
  values (p_poll_id, v_uid, p_option_idx)
  on conflict (poll_id, user_id) do update
    set option_idx = excluded.option_idx, created_at = now();
end;
$function$;
revoke all on function public.vote_chat_poll(uuid, int) from public;
grant execute on function public.vote_chat_poll(uuid, int) to authenticated;

notify pgrst, 'reload schema';
