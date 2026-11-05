import { DEFAULT_EMAIL_COLOR, EMAIL_FOOTER } from "@/config/email";

// Turns an approved template (plain text with {placeholders}, EML-03) into the email that is sent: the subject,
// a plain-text part and a branded HTML part. Pure, so it is unit-tested; lib/email/outbox.ts loads the data.

export type Placeholders = Partial<
  Record<
    | "first_name"
    | "school_name"
    | "sign_in_link"
    | "action_link"
    | "confirm_link"
    | "reason"
    | "message"
    | "graduation_year"
    | "onboarding_link",
    string | null
  >
>;

export type EmailBrand = {
  /** "Herzliah Alumni Network": the header and the sender's display name. */
  networkName: string;
  /** Absolute https URL of the school's logo, or null to show the name only. */
  logoUrl: string | null;
  /** #RRGGBB for the header rule and the links. */
  primaryColor: string;
  locale: "en" | "fr";
};

export type RenderedEmail = { subject: string; text: string; html: string };

/** Replaces each {placeholder}. A missing value becomes empty text, never the raw "{reason}". */
export function fillPlaceholders(template: string, values: Placeholders): string {
  return template
    .replace(
      /\{([a-z_]+)\}/g,
      (_, key: string) => (values as Record<string, string | null>)[key] ?? "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

/** One escaped paragraph, with each http(s) address turned into a link. */
function paragraphHtml(paragraph: string, color: string): string {
  let html = "";
  let last = 0;
  for (const match of paragraph.matchAll(URL_PATTERN)) {
    // A sentence's final period or bracket is not part of the address.
    const url = match[0].replace(/[.,;:!?)]+$/, "");
    const start = match.index;
    html += escapeHtml(paragraph.slice(last, start));
    html += `<a href="${escapeHtml(url)}" style="color:${color};word-break:break-all;">${escapeHtml(url)}</a>`;
    last = start + url.length;
  }
  html += escapeHtml(paragraph.slice(last));
  return html.replace(/\n/g, "<br>");
}

const HEX = /^#[0-9a-f]{6}$/i;

export function renderEmail(
  template: { subject: string; body: string },
  values: Placeholders,
  brand: EmailBrand,
): RenderedEmail {
  // Subjects are one line: a value with a line break must not add a header.
  const subject = fillPlaceholders(template.subject, values).replace(/\s+/g, " ");
  const text = fillPlaceholders(template.body, values);
  const color = HEX.test(brand.primaryColor) ? brand.primaryColor : DEFAULT_EMAIL_COLOR;
  const footer = EMAIL_FOOTER[brand.locale].replace("{network}", brand.networkName);
  const paragraphs = text
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${paragraphHtml(p, color)}</p>`,
    )
    .join("");
  const header = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.networkName)}" height="48" style="display:block;height:48px;width:auto;border:0;">`
    : `<span style="font-size:18px;font-weight:600;">${escapeHtml(brand.networkName)}</span>`;

  const html = `<!doctype html>
<html lang="${brand.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;border-top:4px solid ${color};">
<tr><td style="padding:24px 32px 8px;">${header}</td></tr>
<tr><td style="padding:16px 32px 8px;">${paragraphs}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#71717a;">${escapeHtml(footer)}</p>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
