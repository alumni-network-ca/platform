import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SchoolConfig } from "@/lib/database";

const next = vi.hoisted(() => ({
  options: [] as { keys: string[]; tags: string[]; revalidate: number }[],
  revalidateTag: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
// The cross-request cache itself is Next's; these tests check what is cached, under which key and tag.
vi.mock("next/cache", () => ({
  unstable_cache: (
    fn: (id: string) => unknown,
    keys: string[],
    opts: { tags: string[]; revalidate: number },
  ) => {
    next.options.push({ keys, ...opts });
    return fn;
  },
  revalidateTag: next.revalidateTag,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/supabase/anon", () => ({ anonClient: () => ({ rpc: next.rpc }) }));

const { schoolConfig, refreshSchoolConfig } = await import("@/lib/tenant/config");
const { rolePermissions } = await import("@/lib/auth/permissions");

const config: SchoolConfig = {
  branding: { short_name: "Herzliah" },
  career_fields: [],
  offer_types: [],
  role_permissions: { reviewer: ["directory.use", "requests.read"], alumni: ["directory.use"] },
};

describe("schoolConfig", () => {
  beforeEach(() => {
    next.options.length = 0;
    next.rpc.mockReset();
    next.revalidateTag.mockReset();
  });

  it("reads the school's config through the public RPC, tagged with the school", async () => {
    next.rpc.mockResolvedValue({ data: config, error: null });
    expect(await schoolConfig("a1")).toEqual(config);
    expect(next.rpc).toHaveBeenCalledWith("school_config", { p_inst: "a1" });
    expect(next.options[0]).toEqual({
      keys: ["school-config", "local"],
      tags: ["school-config:a1"],
      revalidate: 300,
    });
  });

  it("throws on a failed read, so it is never cached", async () => {
    next.rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    await expect(schoolConfig("a2")).rejects.toThrow("Could not load the school's settings: down");
  });

  it("answers 404 for a school that is no longer active", async () => {
    next.rpc.mockResolvedValue({ data: null, error: null });
    await expect(schoolConfig("a3")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("gives a role its permissions, and none to a role without any", async () => {
    next.rpc.mockResolvedValue({ data: config, error: null });
    expect(await rolePermissions("a4", "reviewer")).toEqual(["directory.use", "requests.read"]);
    expect(await rolePermissions("a4", "school_admin")).toEqual([]);
  });

  it("clears one school's entry at once, without serving the old one", () => {
    refreshSchoolConfig("a1");
    expect(next.revalidateTag).toHaveBeenCalledWith("school-config:a1", { expire: 0 });
  });
});
