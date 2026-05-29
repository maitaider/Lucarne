"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    // Hard navigation: forces a full request so the server receives the
    // freshly-set auth cookies. A soft router.push can race the cookie write
    // and bounce back to /login.
    window.location.assign(`/${locale}/dashboard`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-text-secondary"
        >
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary placeholder-text-tertiary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-text-secondary"
        >
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          minLength={8}
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary placeholder-text-tertiary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 disabled:opacity-60"
      >
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {t("loginButton")}
      </button>
    </form>
  );
}
