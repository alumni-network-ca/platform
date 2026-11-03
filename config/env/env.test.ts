import { afterEach, describe, expect, it, vi } from "vitest";
import { publicEnv } from "./public";
import { required } from "./read";
import { serverEnv } from "./server";

afterEach(() => vi.unstubAllEnvs());

describe("required", () => {
  it("names the missing variable", () => {
    expect(() => required("SOME_KEY", undefined)).toThrow("SOME_KEY is not set. See .env.example.");
    expect(() => required("SOME_KEY", "")).toThrow("SOME_KEY is not set.");
  });

  it("returns a set value", () => {
    expect(required("SOME_KEY", "value")).toBe("value");
  });
});

describe("publicEnv", () => {
  it("reads on use, so a missing variable fails only the request that needs it", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(() => publicEnv.supabaseUrl).toThrow("NEXT_PUBLIC_SUPABASE_URL is not set.");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    expect(publicEnv.supabaseUrl).toBe("http://127.0.0.1:54321");
  });
});

describe("serverEnv", () => {
  it("defaults to local development", () => {
    vi.stubEnv("ROOT_DOMAIN", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("PREVIEW_DEFAULT_SCHOOL", undefined);
    expect(serverEnv.rootDomain).toBe("localhost");
    expect(serverEnv.isPreview).toBe(false);
    expect(serverEnv.previewDefaultSchool).toBe("herzliah");
  });

  it("is a preview only on Vercel PR previews", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(serverEnv.isPreview).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(serverEnv.isPreview).toBe(true);
  });
});

describe("secrets", () => {
  it("refuses to load outside the server, so no secret can reach a browser bundle", async () => {
    await expect(import("./secrets")).rejects.toThrow(/cannot be imported from a Client Component/);
  });
});
