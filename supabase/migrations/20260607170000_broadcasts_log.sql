-- Journal des diffusions admin (page /admin/broadcast). Une ligne par envoi,
-- quels que soient les canaux, pour afficher l'historique. Écrit uniquement par
-- le service-role (l'action sendAdminBroadcast) ; lecture réservée aux admins.

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  -- canaux utilisés : sous-ensemble de {'salon','in_app','email'}
  channels text[] not null default '{}',
  recipient_count int not null default 0,   -- audience ciblée (courriel)
  emailed int not null default 0,            -- courriels réellement envoyés
  sent_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists broadcasts_created_at_idx
  on public.broadcasts (created_at desc);

alter table public.broadcasts enable row level security;

-- Lecture admin uniquement ; aucune policy write → seul le service-role écrit.
drop policy if exists broadcasts_admin_select on public.broadcasts;
create policy broadcasts_admin_select on public.broadcasts
  for select using (public.is_admin());

revoke all on public.broadcasts from anon, authenticated;
grant select on public.broadcasts to authenticated;

notify pgrst, 'reload schema';
