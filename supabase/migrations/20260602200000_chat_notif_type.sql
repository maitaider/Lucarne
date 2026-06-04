-- Salon (chat global) — 1/2 : nouveau type de notification.
--
-- `chat_mention` est émis quand un message du Salon contient un `@username`.
-- Postgres interdit d'AJOUTER une valeur d'enum puis de l'UTILISER dans la
-- même transaction (« unsafe use of new value »). Les migrations Supabase
-- s'appliquent un fichier = une transaction : on isole donc l'ALTER TYPE ici,
-- la fonction qui l'émet (notify_comment) est (re)créée dans le fichier suivant
-- (20260602200100), garantissant que la valeur est commitée avant usage.
alter type notif_type add value if not exists 'chat_mention';
