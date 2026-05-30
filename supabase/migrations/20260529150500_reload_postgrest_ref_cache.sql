-- =============================================================================
-- After exposing `ref` (previous migration set pgrst.db_schemas), PostgREST
-- accepts the `ref` profile but its schema CACHE still lacks the tables
-- (PGRST205). `reload config` re-reads settings; `reload schema` re-introspects
-- the tables. We also re-assert grants defensively so introspection sees them.
-- `private` is intentionally untouched (stays unexposed).
-- =============================================================================

grant usage on schema ref to anon, authenticated, service_role;
grant select on all tables in schema ref to anon, authenticated, service_role;
alter default privileges in schema ref
  grant select on tables to anon, authenticated, service_role;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';
