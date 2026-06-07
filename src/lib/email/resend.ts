import "server-only";
import { Resend } from "resend";

/**
 * Email sending via Resend. Fully optional: if RESEND_API_KEY is absent, every
 * send is a no-op (`skipped: true`) so the app works without email configured.
 *
 * To enable in prod: set RESEND_API_KEY + EMAIL_FROM (a verified sender, e.g.
 * "Lucarne <noreply@lucarne.ca>") on Vercel.
 */
const FROM = process.env.EMAIL_FROM ?? "Lucarne <onboarding@resend.dev>";

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export type EmailRecipient = { email: string; name?: string | null };

/** Minimal branded HTML wrapper for a reminder/announcement email. */
export function renderEmail(opts: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  recipientName?: string | null;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lucarne.ca";
  const greeting = opts.recipientName ? `Salut ${escapeHtml(opts.recipientName)},` : "Salut,";
  const paragraphs = opts.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#0f1410">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<a href="${opts.ctaUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">${escapeHtml(opts.ctaLabel)}</a>`
      : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f7f2;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <tr><td style="background:#0b3d2e;padding:20px 28px"><span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">Lucarne</span></td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 6px;font-size:22px;color:#0b3d2e">${escapeHtml(opts.heading)}</h1>
        <p style="margin:0 0 16px;color:#52604e">${greeting}</p>
        ${paragraphs}
        ${cta ? `<div style="margin:24px 0">${cta}</div>` : ""}
      </td></tr>
      <tr><td style="padding:18px 28px;background:#f3f7f2;color:#7b8a76;font-size:12px;line-height:1.5">
        Tu reçois cet email car tu es membre de Lucarne. <a href="${appUrl}/profile" style="color:#176943">Gérer mes préférences</a>.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/**
 * Send the SAME email individually to many recipients (one email each — no
 * shared To:, so addresses stay private). Uses Resend batch (≤100/call).
 */
export async function sendBroadcastEmail(opts: {
  recipients: EmailRecipient[];
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<{ sent: number; skipped: boolean; error?: string }> {
  const resend = client();
  if (!resend) return { sent: 0, skipped: true };
  const valid = opts.recipients.filter((r) => r.email && r.email.includes("@"));
  if (valid.length === 0) return { sent: 0, skipped: false };

  let sent = 0;
  let firstError: string | undefined;
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    const { error } = await resend.batch.send(
      chunk.map((r) => ({
        from: FROM,
        to: r.email,
        subject: opts.subject,
        html: renderEmail({
          heading: opts.heading,
          body: opts.body,
          ctaLabel: opts.ctaLabel,
          ctaUrl: opts.ctaUrl,
          recipientName: r.name,
        }),
      })),
    );
    if (error) {
      if (!firstError) firstError = error.message;
    } else {
      sent += chunk.length;
    }
  }
  return { sent, skipped: false, error: firstError };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
