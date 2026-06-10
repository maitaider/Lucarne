-- Le salon-bot (…b07f) doit pouvoir poster des messages plus longs que 280 car.
-- (diffusions admin complètes via sendAdminBroadcast). Les joueurs restent
-- plafonnés à 280 (validé aussi côté serveur dans chat/actions.ts). On préserve
-- l'allègement "image sans texte" introduit par la migration chat_media.

alter table public.comments drop constraint if exists comments_body_check;

alter table public.comments
  add constraint comments_body_check
  check (
    char_length(body) <= (
      case
        when user_id = '00000000-0000-0000-0000-00000000b07f' then 4200
        else 280
      end
    )
    and (char_length(body) >= 1 or image_url is not null)
  );
