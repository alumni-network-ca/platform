// Signing in without the sign-in form, for tests that are not about the form itself, plus helpers to read and
// rewrite the Supabase session cookie. Local stack only: seed accounts keep a local password (ADR 0014).
import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localStack } from "../../scripts/lib/supabase-admin.ts";
import { LOCAL_PASSWORD } from "./accounts";

export const stack = localStack();

/** Another address of the same deployment: swaps the school label of the base URL (null = the root site). */
export function addressOf(baseURL: string, slug: string | null, path = "/") {
  const url = new URL(path, baseURL);
  const parent = url.hostname.split(".").slice(1).join(".");
  url.hostname = slug ? `${slug}.${parent}` : parent;
  return url.toString();
}

// @supabase/ssr stores the session as base64url JSON in sb-<project>-auth-token, split into 3180-character chunks.
const COOKIE = `sb-${new URL(stack.url).hostname.split(".")[0]}-auth-token`;
const CHUNK = 3180;

type Session = { access_token: string; refresh_token: string; expires_at: number };

export async function readSession(context: BrowserContext, address: string): Promise<Session> {
  const parts = (await context.cookies(address)).filter((c) => c.name.startsWith(COOKIE));
  const value = parts
    .sort((a, b) => Number(a.name.split(".").pop()) - Number(b.name.split(".").pop()))
    .map((c) => c.value)
    .join("");
  return JSON.parse(Buffer.from(value.replace(/^base64-/, ""), "base64url").toString());
}

export async function writeSession(context: BrowserContext, address: string, session: object) {
  await context.clearCookies({
    name: new RegExp(`^${COOKIE}(\\.\\d+)?$`),
    domain: new URL(address).hostname,
  });
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const chunks = value.match(new RegExp(`.{1,${CHUNK}}`, "g")) ?? [];
  await context.addCookies(
    chunks.map((chunk, i) => ({
      name: chunks.length === 1 ? COOKIE : `${COOKIE}.${i}`,
      value: chunk,
      domain: new URL(address).hostname,
      path: "/",
      sameSite: "Lax" as const,
    })),
  );
}

/** Signs a seed account in at one school's address only, as its own session (sessions are per address). */
export async function signInAs(context: BrowserContext, address: string, email: string) {
  const supabase = createClient(stack.url, stack.publishableKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: LOCAL_PASSWORD,
  });
  if (error || !data.session) throw new Error(`Could not sign in ${email}: ${error?.message}`);
  await writeSession(context, address, data.session);
}
