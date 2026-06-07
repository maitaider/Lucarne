"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { sendAdminBroadcast } from "@/lib/admin/broadcast";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import {
  Bell,
  Loader2,
  Mail,
  Megaphone,
  Send,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

type Props = {
  locale: Locale;
  emailReady: boolean;
  recipientCount: number;
};

export function BroadcastForm({ locale, emailReady, recipientCount }: Props) {
  const fr = locale === "fr";
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const canSend =
    subject.trim().length >= 3 && message.trim().length >= 3 && (inApp || email);

  function submit() {
    startTransition(async () => {
      const res = await sendAdminBroadcast({ subject, message, inApp, email });
      setConfirming(false);
      if (res.ok) {
        const parts: string[] = [];
        if (res.inApp)
          parts.push(fr ? "notification in-app envoyée" : "in-app sent");
        if (email && !res.emailSkipped)
          parts.push(
            fr
              ? `${res.emailed} courriel(s) envoyé(s)`
              : `${res.emailed} email(s) sent`,
          );
        if (email && res.emailSkipped)
          parts.push(
            fr
              ? "courriel ignoré (fournisseur non configuré)"
              : "email skipped (provider not configured)",
          );
        toast.success(
          (fr ? "Diffusion envoyée — " : "Broadcast sent — ") + parts.join(" · "),
        );
        setSubject("");
        setMessage("");
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Compose */}
      <section className="rounded-md border border-white/[0.08] bg-surface-1/[0.5] p-5 backdrop-blur-xl">
        <header className="mb-4 flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-500/[0.12] text-primary-300 ring-1 ring-primary-500/30">
            <Megaphone className="size-4" strokeWidth={1.7} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-text-primary">
              {fr ? "Composer un message" : "Compose a message"}
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-text-secondary">
              {fr
                ? "Un rappel ou une annonce envoyé à tous les membres. Reste court et clair."
                : "A reminder or announcement sent to every member. Keep it short and clear."}
            </p>
          </div>
        </header>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
          {fr ? "Objet / titre" : "Subject / title"}
        </label>
        <input
          type="text"
          value={subject}
          maxLength={120}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={
            fr
              ? "Ex. Plus que 3 jours pour pronostiquer !"
              : "e.g. 3 days left to predict!"
          }
          className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500/50"
        />

        <label className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
          {fr ? "Message" : "Message"}
        </label>
        <textarea
          value={message}
          rows={6}
          maxLength={4000}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            fr
              ? "Bonjour ! La première rencontre approche. Pense à compléter tes pronostics avant le verrouillage…"
              : "Hi! The first match is coming up. Remember to complete your predictions before the lock…"
          }
          className="w-full resize-y rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500/50"
        />
        <p className="mt-1 text-right text-[10px] tabular-nums text-text-tertiary">
          {message.length}/4000
        </p>
      </section>

      {/* Channels */}
      <section className="rounded-md border border-white/[0.08] bg-surface-1/[0.5] p-5 backdrop-blur-xl">
        <h3 className="mb-3 font-display text-base font-semibold text-text-primary">
          {fr ? "Canaux" : "Channels"}
        </h3>
        <div className="space-y-2.5">
          <ChannelToggle
            icon={Bell}
            on={inApp}
            onToggle={() => setInApp((v) => !v)}
            title={fr ? "Notification in-app" : "In-app notification"}
            desc={
              fr
                ? "Cloche + une annonce dans le fil d'actualité. Tous les membres actifs."
                : "Bell + a post in the news feed. All active members."
            }
            available
          />
          <ChannelToggle
            icon={Mail}
            on={email && emailReady}
            disabled={!emailReady}
            onToggle={() => setEmail((v) => !v)}
            title={fr ? "Courriel" : "Email"}
            desc={
              emailReady
                ? fr
                  ? "Un courriel personnalisé à chaque membre disposant d'une adresse."
                  : "A personalized email to each member with an address."
                : fr
                  ? "Non configuré — ajoute RESEND_API_KEY + EMAIL_FROM sur Vercel pour activer."
                  : "Not configured — add RESEND_API_KEY + EMAIL_FROM on Vercel to enable."
            }
            available={emailReady}
          />
        </div>
      </section>

      {/* Send */}
      <div className="sticky bottom-4 z-20 rounded-md border border-white/[0.1] bg-abyss/95 p-3 shadow-2xl backdrop-blur-xl">
        {confirming ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-gold-300">
              <AlertTriangle className="size-4 shrink-0" strokeWidth={2} />
              {fr
                ? `Confirmer l'envoi à ${recipientCount} membre(s) ?`
                : `Confirm sending to ${recipientCount} member(s)?`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="rounded-sm border border-white/[0.12] px-3 py-2 text-xs text-text-secondary transition hover:text-text-primary"
              >
                {fr ? "Annuler" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500 px-4 py-2 text-xs font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : (
                  <CheckCircle2 className="size-4" strokeWidth={2.5} />
                )}
                {fr ? "Confirmer l'envoi" : "Confirm send"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">
              {fr ? "Destinataires : " : "Recipients: "}
              <b className="text-text-primary tabular-nums">{recipientCount}</b>
              {fr ? " membre(s)" : " member(s)"}
            </p>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!canSend || isPending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-4 py-2.5 text-sm font-bold transition",
                !canSend || isPending
                  ? "bg-white/[0.06] text-text-tertiary"
                  : "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400",
              )}
            >
              <Send className="size-4" strokeWidth={2.5} />
              {fr ? "Envoyer la diffusion" : "Send broadcast"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelToggle({
  icon: Icon,
  on,
  onToggle,
  title,
  desc,
  disabled,
  available,
}: {
  icon: React.ElementType;
  on: boolean;
  onToggle: () => void;
  title: string;
  desc: string;
  disabled?: boolean;
  available: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex w-full items-start gap-3 rounded-sm border px-3 py-3 text-left transition",
        on
          ? "border-primary-500/40 bg-primary-500/[0.08]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ring-1",
          on
            ? "bg-primary-500/15 text-primary-300 ring-primary-500/30"
            : "bg-white/[0.04] text-text-tertiary ring-white/[0.08]",
        )}
      >
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          {!available && (
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
              off
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-4 text-text-secondary">{desc}</p>
      </div>
      <span
        className={cn(
          "mt-1 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
          on ? "bg-primary-500" : "bg-white/[0.12]",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full bg-white transition",
            on && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}
