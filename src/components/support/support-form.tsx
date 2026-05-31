"use client";

import { useState, useTransition } from "react";
import { createSupportTicket } from "@/lib/support/actions";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2, Send } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export function SupportForm({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const res = await createSupportTicket({ subject, message });
      if (res.ok) {
        toast.success(
          fr
            ? "Message envoyé — l'admin a été notifié."
            : "Message sent — the admin was notified.",
        );
        setSubject("");
        setMessage("");
        router.refresh();
      } else {
        toast.error(res.error ?? (fr ? "Échec de l'envoi." : "Send failed."));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label
          htmlFor="support-subject"
          className="mb-1.5 block text-xs font-medium text-text-secondary"
        >
          {fr ? "Sujet" : "Subject"}
        </label>
        <input
          id="support-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          required
          placeholder={fr ? "Ex. Problème de paiement" : "e.g. Payment issue"}
          className="w-full rounded-[8px] border border-white/[0.12] bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </div>
      <div>
        <label
          htmlFor="support-message"
          className="mb-1.5 block text-xs font-medium text-text-secondary"
        >
          {fr ? "Message" : "Message"}
        </label>
        <textarea
          id="support-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          required
          rows={5}
          placeholder={
            fr
              ? "Décris ta question ou ton problème…"
              : "Describe your question or issue…"
          }
          className="w-full resize-y rounded-[8px] border border-white/[0.12] bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || subject.trim().length < 3 || message.trim().length < 5}
        className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-primary-500 px-4 py-2.5 text-sm font-semibold text-abyss transition hover:bg-primary-400 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {fr ? "Envoyer à l'admin" : "Send to admin"}
      </button>
    </form>
  );
}
