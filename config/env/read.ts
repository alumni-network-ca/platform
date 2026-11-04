/** The value of a required environment variable. Throws on first use, so a missing one fails that request, not the build. */
export function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}
