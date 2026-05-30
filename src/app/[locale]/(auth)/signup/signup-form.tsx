"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signUpWithInviteAction } from "@/lib/auth/actions";
import { Loader2 } from "lucide-react";

export function SignupForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const prefilledCode = (searchParams.get("code") ?? "").toUpperCase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const code = String(formData.get("code")).trim().toUpperCase();
    const username = String(formData.get("username")).trim();

    if (!code) {
      setError("Code d'invitation requis.");
      setIsLoading(false);
      return;
    }

    const res = await signUpWithInviteAction({
      email,
      password,
      username,
      code,
    });
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    }
    // On success the server action signs in, redeems the code, and redirects.
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="code"
          className="mb-2 block text-sm font-medium text-text-secondary"
        >
          {t("invitationCodeLabel")}
        </label>
        <input
          id="code"
          name="code"
          required
          defaultValue={prefilledCode}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-text-primary placeholder-text-tertiary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
          placeholder={t("invitationCodePlaceholder")}
        />
      </div>

      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-medium text-text-secondary"
        >
          @username
        </label>
        <input
          id="username"
          name="username"
          required
          pattern="[a-zA-Z0-9_-]{3,24}"
          autoComplete="username"
          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3.5 py-2.5 text-sm text-text-primary placeholder-text-tertiary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
          placeholder="lionel_m"
        />
      </div>

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
          minLength={8}
          autoComplete="new-password"
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
        {t("signupButton")}
      </button>
    </form>
  );
}
