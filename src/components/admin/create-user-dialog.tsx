"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { createUser } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import {
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Created = {
  email: string;
  username: string;
  password: string;
  access_granted: boolean;
};

export function CreateUserButton({
  locale,
  isSuperAdmin,
}: {
  locale: Locale;
  isSuperAdmin: boolean;
}) {
  const fr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"player" | "admin">("player");
  const [markPaid, setMarkPaid] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const loginLink = `${origin}/${locale}/login`;

  function reset() {
    setEmail("");
    setUsername("");
    setDisplayName("");
    setPassword("");
    setRole("player");
    setMarkPaid(false);
    setCreated(null);
    setCopied(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function handleSubmit() {
    if (!email.trim() || !username.trim()) {
      toast.error(fr ? "Email et identifiant requis." : "Email and username required.");
      return;
    }
    startTransition(async () => {
      const res = await createUser({
        email: email.trim(),
        username: username.trim(),
        display_name: displayName.trim() || undefined,
        password: password.trim() || undefined,
        role,
        mark_paid: markPaid,
      });
      if (res.ok) {
        setCreated({
          email: res.email,
          username: res.username,
          password: res.password,
          access_granted: res.access_granted,
        });
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function copyCredentials() {
    if (!created) return;
    const block = fr
      ? `Lucarne — tes accès\nEmail : ${created.email}\nMot de passe : ${created.password}\nConnexion : ${loginLink}`
      : `Lucarne — your login\nEmail: ${created.email}\nPassword: ${created.password}\nLogin: ${loginLink}`;
    navigator.clipboard.writeText(block);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fieldCls =
    "w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500/50";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500 px-3 py-2 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
      >
        <UserPlus className="size-4" strokeWidth={2.2} />
        {fr ? "Ajouter un joueur" : "Add a player"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-abyss/80 backdrop-blur-sm"
          />
          <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
            <div className="max-h-[88dvh] overflow-y-auto rounded-[14px] border border-white/[0.1] bg-abyss/95 shadow-2xl backdrop-blur-2xl">
              <header className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-4">
                <UserPlus className="size-4 text-primary-300" strokeWidth={1.9} />
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {created
                    ? fr
                      ? "Joueur créé"
                      : "Player created"
                    : fr
                      ? "Ajouter un joueur"
                      : "Add a player"}
                </h3>
              </header>

              {created ? (
                /* ── Success: show credentials to share ── */
                <div className="space-y-4 p-5">
                  <div className="flex items-start gap-2 rounded-sm border border-primary-500/25 bg-primary-500/[0.07] px-3 py-2.5">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-primary-300"
                      strokeWidth={2}
                    />
                    <p className="text-xs text-text-secondary">
                      {fr
                        ? "Compte créé et ajouté à la ligue maison. Transmets ces accès au joueur — il peut se connecter tout de suite."
                        : "Account created and added to the house league. Share these credentials — they can log in right away."}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-[10px] border border-white/[0.08] bg-white/[0.03] p-3 font-mono text-xs">
                    <CredRow label="Email" value={created.email} />
                    <CredRow
                      label={fr ? "Mot de passe" : "Password"}
                      value={created.password}
                    />
                    <CredRow label={fr ? "Connexion" : "Login"} value={loginLink} />
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-3 py-2 text-xs",
                      created.access_granted
                        ? "bg-primary-500/10 text-primary-200"
                        : "bg-gold-500/10 text-gold-200",
                    )}
                  >
                    <KeyRound className="size-3.5" strokeWidth={2} />
                    {created.access_granted
                      ? fr
                        ? "Accès débloqué (marqué payé)."
                        : "Access unlocked (marked paid)."
                      : fr
                        ? "Accès non payé — le joueur devra régler sa place pour pronostiquer."
                        : "Access unpaid — the player must pay their seat to make picks."}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyCredentials}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-primary-500 px-4 py-2 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
                    >
                      {copied ? (
                        <Check className="size-4" strokeWidth={2.5} />
                      ) : (
                        <Copy className="size-4" strokeWidth={2} />
                      )}
                      {copied
                        ? fr
                          ? "Copié"
                          : "Copied"
                        : fr
                          ? "Copier les accès"
                          : "Copy credentials"}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-sm border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-sm font-semibold text-text-secondary transition hover:bg-white/[0.1] hover:text-text-primary"
                    >
                      {fr ? "Un autre" : "Another"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={close}
                    className="w-full rounded-md px-3 py-1.5 text-xs text-text-tertiary hover:text-text-primary"
                  >
                    {fr ? "Fermer" : "Close"}
                  </button>
                </div>
              ) : (
                /* ── Form ── */
                <div className="space-y-3 p-5">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-text-secondary">
                      Email *
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="joueur@email.com"
                      className={fieldCls}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-text-secondary">
                      {fr ? "Identifiant" : "Username"} *
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="le-i-grec"
                      maxLength={24}
                      className={fieldCls}
                    />
                    <span className="mt-1 block text-[10px] text-text-tertiary">
                      {fr
                        ? "3 à 24 caractères : lettres, chiffres, - et _."
                        : "3–24 chars: letters, digits, - and _."}
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-text-secondary">
                      {fr ? "Nom affiché" : "Display name"}
                    </span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={fr ? "Optionnel" : "Optional"}
                      maxLength={40}
                      className={fieldCls}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-text-secondary">
                      {fr ? "Mot de passe" : "Password"}
                    </span>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        fr ? "Laisser vide = généré" : "Leave empty = generated"
                      }
                      className={fieldCls}
                    />
                  </label>

                  {isSuperAdmin && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-text-secondary">
                        {fr ? "Rôle" : "Role"}
                      </span>
                      <select
                        value={role}
                        onChange={(e) =>
                          setRole(e.target.value as "player" | "admin")
                        }
                        className={fieldCls}
                      >
                        <option value="player">
                          {fr ? "Joueur" : "Player"}
                        </option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                  )}

                  <label className="flex items-start gap-2.5 rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={markPaid}
                      onChange={(e) => setMarkPaid(e.target.checked)}
                      className="mt-0.5 size-4 accent-primary-500"
                    />
                    <span className="text-xs text-text-secondary">
                      {fr
                        ? "Déjà payé — débloque l'accès tout de suite (enregistre un paiement manuel)."
                        : "Already paid — unlocks access now (records a manual payment)."}
                    </span>
                  </label>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isPending}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm px-4 py-2.5 text-sm font-bold transition",
                        isPending
                          ? "bg-white/[0.06] text-text-tertiary"
                          : "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400",
                      )}
                    >
                      {isPending ? (
                        <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                      ) : (
                        <UserPlus className="size-4" strokeWidth={2.2} />
                      )}
                      {fr ? "Créer le joueur" : "Create player"}
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      disabled={isPending}
                      className="rounded-sm px-3 py-2.5 text-sm text-text-tertiary hover:text-text-primary"
                    >
                      {fr ? "Annuler" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-text-tertiary">{label}</span>
      <span className="truncate text-text-primary">{value}</span>
    </div>
  );
}
