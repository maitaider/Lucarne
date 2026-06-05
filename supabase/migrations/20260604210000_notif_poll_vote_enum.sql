-- Notifications + : nouveau type « poll_vote » (on a voté sur ton sondage).
-- Isolé (add value puis usage en transactions séparées, comme chat_mention).
alter type notif_type add value if not exists 'poll_vote';
