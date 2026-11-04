/**
 * A ?next= value we may redirect to: a path on this site only (F7). Rejects absolute and protocol-relative
 * URLs ("//evil.example", "/\evil.example"), schemes ("javascript:"), and control characters.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value || value.length > 512) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  return value;
}

/** Account creation normally leads to alumni signup; staff invitations resume their separate acceptance flow. */
export function signupDestination(value: string | null | undefined): string {
  const next = safeNext(value);
  return next?.split(/[?#]/)[0] === "/staff/accept" ? next : "/join";
}

/** The token of a staff invitation destination ("/staff/accept?token=…"); null for any other destination. */
export function invitationToken(destination: string): string | null {
  const [path = "", query = ""] = destination.split("#")[0]!.split("?");
  if (path !== "/staff/accept") return null;
  return new URLSearchParams(query).get("token") || null;
}
