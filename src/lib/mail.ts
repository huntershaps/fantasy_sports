import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound email.
 *
 * There is one sender (SMTP) because that is what the archive already has
 * credentials for. Everything goes through `isMailConfigured()` first, so the
 * UI can tell the truth about whether a message will actually arrive rather
 * than claiming one is on its way into a void.
 */

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_USER = process.env.SMTP_USER ?? "";

/** True only when a real transport is configured — placeholders do not count. */
export function isMailConfigured(): boolean {
  return Boolean(SMTP_HOST) && !SMTP_HOST.includes("example") && Boolean(SMTP_USER);
}

/** The public origin, used to build absolute links inside emails. */
export function appUrl(): string {
  const raw = process.env.APP_URL || "http://localhost:8000";
  return raw.replace(/\/+$/, "");
}

let cached: Transporter | null = null;

function transport(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return cached;
}

type Message = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Send a message. Returns whether it went out.
 *
 * Never throws: callers are auth flows that must not reveal, through an error,
 * whether a given address has an account. Failures are logged for the operator
 * and reported as a plain false.
 */
export async function sendMail(message: Message): Promise<boolean> {
  if (!isMailConfigured()) return false;

  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM || SMTP_USER,
      ...message,
    });
    return true;
  } catch (error) {
    console.error("[mail] send failed:", error);
    return false;
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** The password reset message. */
export function passwordResetMessage(to: string, link: string, minutes: number): Message {
  const safeLink = escapeHtml(link);
  return {
    to,
    subject: "Reset your Museum of Fantasy Sports password",
    text: [
      "Someone asked to reset the password on your Museum of Fantasy Sports account.",
      "",
      `Open this link to choose a new one. It expires in ${minutes} minutes and can only be used once:`,
      link,
      "",
      "If this was not you, ignore this message — nothing has changed, and the link",
      "cannot be used without opening it.",
    ].join("\n"),
    html: `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#15172a">
  <p>Someone asked to reset the password on your Museum of Fantasy Sports account.</p>
  <p>
    <a href="${safeLink}" style="display:inline-block;padding:10px 18px;background:#15172a;color:#fff;text-decoration:none;border-radius:6px">
      Choose a new password
    </a>
  </p>
  <p style="color:#5a5d69;font-size:14px">
    The link expires in ${minutes} minutes and can only be used once.<br>
    If this was not you, ignore this message — nothing has changed.
  </p>
  <p style="color:#5a5d69;font-size:12px;word-break:break-all">${safeLink}</p>
</div>`.trim(),
  };
}
