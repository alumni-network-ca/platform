import { LINK_TRAILING_PUNCTUATION, URL_PATTERN } from "@/config/email";

// HTML helpers for text written by people (templates, names, reasons): everything is escaped, and only addresses
// the caller trusts become links. Pure, so they are unit-tested.

/** Text made safe to place in HTML, attribute values included. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Plain text as escaped HTML: line breaks become <br>, and each http(s) address in `links` (and only those) becomes
 * a link in `color`. A sentence's final period or bracket stays outside the link.
 */
export function linkifyText(text: string, links: ReadonlySet<string>, color: string): string {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(LINK_TRAILING_PUNCTUATION, "");
    if (!links.has(url)) continue;
    html += escapeHtml(text.slice(last, match.index));
    html += `<a href="${escapeHtml(url)}" style="color:${color};word-break:break-all;">${escapeHtml(url)}</a>`;
    last = match.index + url.length;
  }
  html += escapeHtml(text.slice(last));
  return html.replace(/\n/g, "<br>");
}
