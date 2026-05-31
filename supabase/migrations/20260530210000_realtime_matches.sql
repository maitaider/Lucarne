-- Broadcast ref.matches changes over Supabase Realtime. When the admin enters
-- a result (a match flips to 'finished'), the settle trigger re-scores bets and
-- refreshes the standings materialized views — so clients listening to
-- ref.matches can refresh their leaderboard instantly. (anon/authenticated
-- already have SELECT on ref.matches, required for Realtime delivery.)
do $$ begin
  alter publication supabase_realtime add table ref.matches;
exception when duplicate_object then null; end $$;
