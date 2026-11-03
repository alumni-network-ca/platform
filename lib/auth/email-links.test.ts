import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Origin } from "@/lib/tenant/address";

const request = vi.hoisted(() => ({ getOrigin: vi.fn(), getSchool: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/tenant/server", () => request);

import { authEmailRedirect } from "./email-links";

function origin(overrides: Partial<Origin> = {}) {
  request.getOrigin.mockResolvedValue({
    protocol: "https:",
    host: "alumni-preview.example.com",
    rootDomain: "localhost",
    isPreview: false,
    ...overrides,
  });
}

describe("auth email destinations", () => {
  beforeEach(() => {
    origin();
    request.getSchool.mockResolvedValue({ slug: "herzliah" });
  });

  it("keeps temporary custom domains even when ROOT_DOMAIN is still localhost", async () => {
    expect(await authEmailRedirect("signup")).toBe(
      "https://alumni-preview.example.com/auth/confirm?flow=signup",
    );
  });

  it("keeps the selected school on shared Vercel previews", async () => {
    origin({ host: "alumni-team.vercel.app", isPreview: true });
    const url = new URL(await authEmailRedirect("signup", "/staff/accept?token=invitation"));
    expect(url.host).toBe("alumni-team.vercel.app");
    expect(url.searchParams.get("tenant")).toBe("herzliah");
    expect(url.searchParams.get("next")).toBe("/staff/accept?token=invitation");
  });

  it("keeps the root site selector for preview password recovery", async () => {
    origin({ isPreview: true });
    request.getSchool.mockResolvedValue(null);
    const url = new URL(await authEmailRedirect("recovery"));
    expect(url.searchParams.get("tenant")).toBe("root");
    expect(url.searchParams.get("flow")).toBe("recovery");
  });

  it("preserves local hosts and ports", async () => {
    origin({ protocol: "http:", host: "herzliah.localhost:3001" });
    expect(await authEmailRedirect("signup")).toBe(
      "http://herzliah.localhost:3001/auth/confirm?flow=signup",
    );
  });

  it("discards external continuation URLs", async () => {
    const url = new URL(await authEmailRedirect("signup", "https://other.example"));
    expect(url.searchParams.has("next")).toBe(false);
  });
});
