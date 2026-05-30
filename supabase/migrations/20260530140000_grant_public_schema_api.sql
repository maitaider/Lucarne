-- =============================================================================
-- ROOT CAUSE OF THE LOGIN LOOP
-- ---------------------------------------------------------------------------
-- The `public` schema tables were never granted to the PostgREST roles. The
-- initial schema only issued `grant usage on schema public` — the per-table
-- SELECT/DML grants that the `ref` schema received were never written for
-- `public`. Locally this is masked by Supabase's preconfigured default
-- privileges, but on the rebuilt remote every public table returns
--   42501  permission denied for table <t>
-- for anon / authenticated / service_role.
--
-- Effect: after a *successful* sign-in, getCurrentUser() reads the caller's
-- `profiles` row; the read is denied → returns null → the (app) layout
-- redirects back to /login with NO error. That is the "click login, land back
-- on login, no message" loop.
--
-- Fix: grant table/sequence privileges explicitly (mirroring `ref`). RLS stays
-- the row-level gate — all 17 public tables have RLS enabled, and `profiles`
-- already has a `to authenticated ... using (deleted_at is null)` SELECT
-- policy. `private` is intentionally left untouched (never exposed).
-- =============================================================================

-- Current tables
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;

-- Sequences (identity/serial columns on insert)
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Future tables created by the migration role
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

-- Rebuild PostgREST's view of the schema + roles
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
