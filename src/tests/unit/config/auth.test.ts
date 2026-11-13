// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CODE_LENGTH, MIN_PASSWORD_LENGTH } from "@/config/auth";

// Supabase Auth enforces these settings; the app repeats them in its forms and messages. Hosted projects get them from
// the same file through `supabase config push` (FND-16).
const toml = readFileSync(new URL("../../../../supabase/config.toml", import.meta.url), "utf8");

/** A number setting of one [section] in supabase/config.toml. */
function setting(section: string, key: string): number {
  const body = toml.split(/^\[/m).find((part) => part.startsWith(`${section}]`));
  const value = body?.match(new RegExp(`^${key}\\s*=\\s*(\\d+)`, "m"))?.[1];
  if (value === undefined) throw new Error(`[${section}] ${key} is not in supabase/config.toml.`);
  return Number(value);
}

describe("config/auth.ts mirrors supabase/config.toml", () => {
  it("minimum password length", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(setting("auth", "minimum_password_length"));
  });

  it("emailed code length", () => {
    expect(CODE_LENGTH).toBe(setting("auth.email", "otp_length"));
  });
});
