"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { createLeague } from "@/lib/leagues/actions";
import { Loader2 } from "lucide-react";

export function CreateLeagueForm({ locale }: { locale: "fr" | "en" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [allowsRealMoney, setAllowsRealMoney] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto-generate slug from name
  function onNameChange(v: string) {
    setName(v);
    const auto = v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40);
    setSlug(auto);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createLeague({
        name,
        slug,
        description: description || undefined,
        visibility: "private",
        member_limit: 50,
        allows_real_money: allowsRealMoney,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(`/leagues/${slug}`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[8px] border border-white/[0.08] bg-surface-1/[0.72] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
    >
      <Field
        label={locale === "fr" ? "Nom de la ligue" : "League name"}
        hint={locale === "fr" ? "Ex: Les Bleus du bureau" : "E.g. Office Cup"}
      >
        <input
          required
          maxLength={50}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-lg border border-white/[0.1] bg-abyss/[0.48] px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </Field>

      <Field
        label="Slug (URL)"
        hint={`lucarne.ca/leagues/${slug || "..."}`}
      >
        <input
          required
          pattern="[a-z0-9-]{3,40}"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          className="w-full rounded-lg border border-white/[0.1] bg-abyss/[0.48] px-3.5 py-2.5 font-mono text-sm text-text-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </Field>

      <Field
        label={locale === "fr" ? "Description" : "Description"}
        hint={locale === "fr" ? "Optionnel" : "Optional"}
      >
        <textarea
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-lg border border-white/[0.1] bg-abyss/[0.48] px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </Field>

      <label className="flex items-start gap-3 rounded-[8px] border border-white/[0.1] bg-white/[0.045] p-3 transition hover:bg-white/[0.07]">
        <input
          type="checkbox"
          checked={allowsRealMoney}
          onChange={(e) => setAllowsRealMoney(e.target.checked)}
          className="mt-0.5 size-4 accent-gold-500"
        />
        <div>
          <div className="text-sm font-medium text-text-primary">
            {locale === "fr" ? "Activer les paris à argent réel" : "Enable real-money bets"}
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {locale === "fr"
              ? "Les paris peuvent être convertis en argent réel via validation admin."
              : "Bets can be converted to real money via admin validation."}
          </p>
        </div>
      </label>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-primary-500 px-4 py-3 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 disabled:opacity-50"
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {locale === "fr" ? "Créer la ligue" : "Create league"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium text-text-secondary">{label}</span>
        {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
