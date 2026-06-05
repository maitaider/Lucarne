-- Force PostgREST to reload its schema cache so the freshly-added
-- match_consensus(uuid[]) RPC (migration 20260605100000) becomes callable via
-- the REST API. On the prior push the cache didn't pick it up (the RPC returned
-- PGRST202 "not found in schema cache" while the function existed in the DB).
--
-- A COMMENT is a DDL command → fires Supabase's pgrst_ddl_watch event trigger,
-- which is the canonical auto-reload path; the explicit NOTIFY is a fallback.
comment on function public.match_consensus(uuid[]) is
  'Consensus agrégé du groupe par match (compteurs home/draw/away ; dérive le vainqueur de exact_score). SECURITY DEFINER, ne renvoie que des compteurs (aucune fuite de pari individuel).';

comment on function public.cron_send_kickoff_reminders(int) is
  'Cron service-role : notifie les joueurs payés sans prono des matchs à venir (idempotent, 1 par joueur+match).';

notify pgrst, 'reload schema';
