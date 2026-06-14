-- Fix kickoff times: the WC2026 seed (20260522010000) was off by +1 hour.
--
-- The seed stored every kickoff as UTC = (Eastern local time) + 5h — i.e. it
-- used the WINTER offset EST (UTC-5). But the whole tournament (11 Jun → 19 Jul
-- 2026) runs during EDT (UTC-4, summer). So every match was stored 1 hour too
-- LATE. Examples confirmed against reality:
--   BRA-MAR seeded 2026-06-13T23:00Z → shown 19:00 ET, actually kicked off 18:00
--   HAI-SCO seeded 2026-06-14T02:00Z → shown 22:00 ET, actually live at 21:00
-- The America/Toronto display is correct; only the stored data is wrong.
--
-- Shift every kickoff 1 hour earlier so it matches the real Eastern schedule,
-- and keep tournament_start_at (countdown + global prediction lock) in sync with
-- the corrected opening match.
--
-- User triggers are disabled for the bulk shift: this is a schedule correction,
-- NOT a result event, so it must not re-fire result announcements, follower
-- notifications, or bet settlement (which fire AFTER UPDATE on ref.matches).

alter table ref.matches disable trigger user;

update ref.matches
   set kickoff_at = kickoff_at - interval '1 hour';

alter table ref.matches enable trigger user;

update public.app_settings
   set tournament_start_at = tournament_start_at - interval '1 hour';
