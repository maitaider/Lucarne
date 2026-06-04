/**
 * Static constants for the global salon (chat).
 * No "use server" — importable from both client components and server actions.
 */

/**
 * Sentinel `parent_id` for the single global salon thread. Messages are stored
 * in `public.comments` with `parent_type = 'global'` and this fixed parent_id.
 */
export const GLOBAL_CHAT_ID = "00000000-0000-0000-0000-000000000000";

/** Max message length — mirrors the `comments.body` CHECK (1..280). */
export const CHAT_MAX_LEN = 280;
