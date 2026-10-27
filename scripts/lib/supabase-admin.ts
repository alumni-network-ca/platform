// Shared by the admin scripts in scripts/. Runs on Node 22.18+ (TypeScript is stripped natively).
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database";

export type Target = { url: string; secretKey: string };

/** API URL, keys and Mailpit URL of the local stack started with `supabase start`. Also used by e2e tests. */
export function localStack(): Target & { publishableKey: string; mailpitUrl: string } {
  const output = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const env = new Map(
    output.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
      return match?.[1] && match[2] !== undefined ? [[match[1], match[2]] as const] : [];
    }),
  );
  const url = env.get("API_URL");
  const secretKey = env.get("SECRET_KEY") ?? env.get("SERVICE_ROLE_KEY");
  const publishableKey = env.get("PUBLISHABLE_KEY") ?? env.get("ANON_KEY");
  const mailpitUrl = env.get("MAILPIT_URL") ?? env.get("INBUCKET_URL") ?? "http://127.0.0.1:54324";
  if (!url || !secretKey || !publishableKey)
    throw new Error("The local stack is not running: start it with `supabase start`.");
  return { url, secretKey, publishableKey, mailpitUrl };
}

export function isLocal(url: string): boolean {
  return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname);
}

/** A client that bypasses RLS. Server-side scripts only; the key never goes to a browser. */
export function adminClient({ url, secretKey }: Target) {
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
