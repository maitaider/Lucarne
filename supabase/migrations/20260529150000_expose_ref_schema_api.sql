-- =============================================================================
-- Expose the `ref` schema (teams, matches, players) to the PostgREST API on the
-- remote project. `db push`/`db reset` apply DB migrations but NOT the API
-- gateway's exposed-schema list, so on a fresh remote only `public` +
-- `graphql_public` are exposed → ref.* queries fail with PGRST106.
--
-- Setting the authenticator role's pgrst.db_schemas GUC + reloading is the
-- durable, SQL-only way to expose it (mirrors config.toml [api] schemas).
-- `private` is intentionally NOT exposed.
-- =============================================================================

alter role authenticator
  set pgrst.db_schemas = 'public, graphql_public, ref';

notify pgrst, 'reload config';
