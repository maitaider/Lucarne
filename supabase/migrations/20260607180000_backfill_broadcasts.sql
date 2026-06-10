-- Backfill de l'historique des diffusions à partir des annonces admin déjà
-- publiées (news_posts créées par publish_news, avant l'existence de la table
-- broadcasts). Unique : on ne marque que le canal 'in_app' (le seul à avoir
-- laissé une trace) ; recipient_count/emailed inconnus → 0. Idempotent : ignore
-- une annonce déjà loguée (même objet + corps).

do $$
declare
  n int;
begin
  insert into public.broadcasts (subject, body, channels, recipient_count, emailed, sent_by, created_at)
  select
    np.title,
    np.body,
    array['in_app']::text[],
    0,
    0,
    np.author_id,
    np.created_at
  from public.news_posts np
  where np.source = 'admin'
    and np.kind = 'announcement'
    and not exists (
      select 1 from public.broadcasts b
      where b.subject = np.title and b.body = np.body
    );
  get diagnostics n = row_count;
  raise notice 'broadcasts backfill: % ligne(s) insérée(s)', n;
end $$;
