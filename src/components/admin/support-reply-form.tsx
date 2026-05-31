"use client";

import { useState, useTransition } from "react";
import { replySupportTicket } from "@/lib/support/actions";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { Check, Loader2, Send } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export function SupportReplyForm({
  ticketId,
  resolved,
  existingNote,
  locale,
}: {
  ticketId: string;
  resolved: boolean;
  existingNote: string | null;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(existingNote ?? "");
  const [isPending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit(resolve: boolean) {
    if (!note.trim()) {
      toast.error(fr ? "Écris une réponse." : "Write a reply.");
      return;
    }
    start(async () => {
      const res = await replySupportTicket({ ticketId, note: note.trim(), resolve });
      if (res.ok) {
        toast.success(
          resolve
            ? fr
              ? "Réponse envoyée, ticket résolu."
              : "Reply sent, ticket resolved."
            : fr
              ? "Réponse envoyée."
              : "Reply sent.",
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[7px] border border-primary-500/35 bg-primary-500/10 px-2.5 py-1.5 text-xs font-semibold text-primary-300 transition hover:bg-primary-500/20"
      >
        <Send className="size-3.5" />
        {resolved ? (fr ? "Répondre encore" : "Reply again") : fr ? "Répondre" : "Reply"}
      </button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-sm border border-white/[0.1] bg-black/20 p-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={4000}
        autoFocus
        placeholder={
          fr ? "Ta réponse au joueur…" : "Your reply to the player…"
        }
        className="w-full resize-none rounded-[7px] border border-white/[0.1] bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-[7px] bg-primary-500 px-3 py-1.5 text-xs font-semibold text-abyss transition hover:bg-primary-400 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          {fr ? "Répondre & résoudre" : "Reply & resolve"}
        </button>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-[7px] border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary disabled:opacity-60"
        >
          <Send className="size-3.5" />
          {fr ? "Répondre sans résoudre" : "Reply only"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-xs text-text-tertiary transition hover:text-text-primary"
        >
          {fr ? "Annuler" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
