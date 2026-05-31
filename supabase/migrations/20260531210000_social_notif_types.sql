-- =============================================================================
-- Phase 3 item B (sous-lot 1) — types de notif sociaux
-- =============================================================================
-- `ALTER TYPE ... ADD VALUE` doit être isolé de toute UTILISATION du nouveau
-- libellé dans la même transaction (même précaution que le split
-- support_ticket : 20260530200000 puis 20260530200100). On ajoute donc les
-- valeurs ici ; les triggers qui les émettent vivent dans la migration suivante
-- (`20260531210100_social_notif_triggers.sql`).
--
-- `league_position` (joueur dépassé au classement) existe déjà dans l'enum.
-- =============================================================================

alter type notif_type add value if not exists 'reaction_received';
alter type notif_type add value if not exists 'comment_received';
