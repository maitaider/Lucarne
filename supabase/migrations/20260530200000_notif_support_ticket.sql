-- Add the 'support_ticket' notification type. Must be in its own migration
-- (committed) before it can be USED by the trigger in the next migration —
-- Postgres forbids using a newly-added enum value in the same transaction.
alter type notif_type add value if not exists 'support_ticket';
