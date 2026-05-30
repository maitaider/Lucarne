"use client";

import { useState, useTransition } from "react";
import { updateDisplayNameAction } from "@/lib/profile/actions";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2 } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export function DisplayNameForm({
  current,
  locale,
}: {
  current: string | null;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [name, setName] = useState(current ?? "");
  const [isPending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const res = await updateDisplayNameAction(name);
      if (res.ok) {
        toast.success(fr ? "Nom mis à jour." : "Name updated.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-xs font-medium text-text-secondary">
          {fr ? "Nom affiché" : "Display name"}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={fr ? "Ton nom" : "Your name"}
          className="rounded-[8px] border border-white/[0.12] bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </label>
      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-primary-500 px-4 py-2.5 text-sm font-semibold text-abyss transition hover:bg-primary-400 disabled:opacity-60"
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {fr ? "Enregistrer" : "Save"}
      </button>
    </form>
  );
}
