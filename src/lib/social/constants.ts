/**
 * Static constants for the social module.
 * Kept in a separate file (no "use server" directive) so client components
 * and server actions can both import them without violating the
 * "use server" rule that exports must be async functions only.
 */

export type ReactionKind =
  | "fire"
  | "clap"
  | "laugh"
  | "think"
  | "shock"
  | "skull";

export const REACTIONS: ReactionKind[] = [
  "fire",
  "clap",
  "laugh",
  "think",
  "shock",
  "skull",
];
