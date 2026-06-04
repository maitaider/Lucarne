"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createChatPoll } from "@/lib/chat/actions";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { BarChart3, Loader2, Plus, X } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export function PollComposer({
  locale,
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  const fr = locale === "fr";
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const canCreate =
    question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2;

  async function create() {
    if (!canCreate || busy) return;
    setBusy(true);
    const res = await createChatPoll(question, options, locale);
    setBusy(false);
    if (res.ok) onClose();
    else toast.error(res.message);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-abyss/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[16px] border border-white/[0.1] bg-surface-1 p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <BarChart3 className="size-5 text-violet-300" strokeWidth={2} />
            {fr ? "Nouveau sondage" : "New poll"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={fr ? "Fermer" : "Close"}
            className="flex size-8 items-center justify-center rounded-sm text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
          >
            <X className="size-4" strokeWidth={1.7} />
          </button>
        </div>

        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={200}
          autoFocus
          placeholder={fr ? "Ta question…" : "Your question…"}
          className="w-full rounded-[10px] border border-white/[0.1] bg-abyss/40 px-3 py-2 text-sm text-text-primary outline-none focus:border-violet-500/50"
        />

        <div className="mt-3 space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={o}
                onChange={(e) =>
                  setOptions((opts) => opts.map((x, idx) => (idx === i ? e.target.value : x)))
                }
                maxLength={60}
                placeholder={`${fr ? "Option" : "Option"} ${i + 1}`}
                className="flex-1 rounded-[8px] border border-white/[0.1] bg-abyss/40 px-3 py-1.5 text-sm text-text-primary outline-none focus:border-violet-500/50"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions((opts) => opts.filter((_, idx) => idx !== i))}
                  aria-label={fr ? "Retirer" : "Remove"}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:text-error"
                >
                  <X className="size-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button
              type="button"
              onClick={() => setOptions((opts) => [...opts, ""])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 transition hover:text-violet-200"
            >
              <Plus className="size-3.5" strokeWidth={2} />
              {fr ? "Ajouter une option" : "Add option"}
            </button>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] px-3 py-2 text-sm font-semibold text-text-secondary transition hover:text-text-primary"
          >
            {fr ? "Annuler" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={create}
            disabled={!canCreate || busy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-sm font-bold transition",
              canCreate && !busy
                ? "bg-violet-500 text-white hover:bg-violet-400"
                : "bg-white/[0.06] text-text-tertiary",
            )}
          >
            {busy && <Loader2 className="size-4 animate-spin" strokeWidth={2} />}
            {fr ? "Créer le sondage" : "Create poll"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
