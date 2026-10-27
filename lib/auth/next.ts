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
