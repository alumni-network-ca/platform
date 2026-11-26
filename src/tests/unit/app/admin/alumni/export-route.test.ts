import { afterEach, describe, expect, it, vi } from "vitest";
import { translations } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({ requireStaff: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/staff", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/lib/admin/data", () => ({
  adminCopy: async () => ({ locale: "en", t: translations.en.admin }),
}));

import { POST } from "@/app/admin/alumni/export/route";

const post = (fields: Record<string, string>) => {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return POST(new Request("http://localhost/admin/alumni/export", { method: "POST", body }));
};

describe("/admin/alumni/export", () => {
  afterEach(() => vi.clearAllMocks());

  it("asks for the export permission and passes the roster's filters to the database", async () => {
    mocks.requireStaff.mockResolvedValue({
      supabase: { rpc: mocks.rpc },
      school: { id: "school-1", slug: "herzliah" },
    });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const response = await post({ q: "Cohen", state: "published", min: "2015", max: "2000" });
    expect(mocks.requireStaff).toHaveBeenCalledWith("/admin/alumni", "records.export");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_export_alumni", {
      p_inst: "school-1",
      p_query: "Cohen",
      p_state: "published",
      p_class_min: 2000,
      p_class_max: 2015,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="herzliah-alumni-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 403 when the database refuses", async () => {
    mocks.requireStaff.mockResolvedValue({
      supabase: { rpc: mocks.rpc },
      school: { id: "school-1", slug: "herzliah" },
    });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await post({})).status).toBe(403);
  });

  it("never queries when the staff check refuses (reviewers)", async () => {
    mocks.requireStaff.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(post({})).rejects.toThrow("403");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
