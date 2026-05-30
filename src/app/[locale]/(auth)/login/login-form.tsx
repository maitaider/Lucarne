"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signInWithPasswordAction } from "@/lib/auth/actions";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const res = await signInWithPasswordAction(email, password);
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    }
    // On success the server action sets the session cookies and redirects to
    // /dashboard server-side — nothing else to do here.
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
