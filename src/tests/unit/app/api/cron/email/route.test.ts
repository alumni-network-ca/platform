import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deliverOutbox: vi.fn(),
  getOrigin: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/email/outbox", () => ({ deliverOutbox: mocks.deliverOutbox }));
vi.mock("@/lib/tenant/server", () => ({ getOrigin: mocks.getOrigin }));

import { SWEEP_BATCH } from "@/config/email";
import { GET } from "@/app/api/cron/email/route";

const call = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/cron/email", {
      headers: authorization ? { authorization } : {},
    }),
  );

describe("/api/cron/email", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    mocks.getOrigin.mockResolvedValue({ host: "localhost" });
    mocks.deliverOutbox.mockResolvedValue({ sent: 1, retried: 0, failed: 0, skipped: 0 });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it.each([undefined, "Bearer wrong", "Bearer s3cre", "s3cret"])(
    "refuses %s without sending anything",
    async (authorization) => {
      expect((await call(authorization)).status).toBe(401);
      expect(mocks.deliverOutbox).not.toHaveBeenCalled();
    },
  );

  it("sweeps one batch with the right secret", async () => {
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 1, retried: 0, failed: 0, skipped: 0 });
    expect(mocks.deliverOutbox).toHaveBeenCalledWith({
      origin: { host: "localhost" },
      limit: SWEEP_BATCH,
    });
  });

  it("stays closed when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    await expect(call("Bearer ")).rejects.toThrow("CRON_SECRET is not set");
    expect(mocks.deliverOutbox).not.toHaveBeenCalled();
  });
});
