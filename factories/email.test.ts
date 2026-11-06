import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RESEND_API_URL } from "@/config/email";
import { PermanentEmailError } from "@/lib/email/errors";
import { resendTransport } from "./email";

describe("resendTransport", () => {
  it("posts to Resend with the outbox id as idempotency key and the school's sender", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM_DOMAIN", "alumninetwork.ca");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ id: "resend-1" }));
    const send = resendTransport();
    const result = await send({
      id: "outbox-1",
      to: "ari@example.test",
      fromName: 'Herzliah "Alumni" Network',
      replyTo: "alumni@herzliah.test",
      subject: "s",
      text: "t",
      html: "h",
    });
    expect(result).toEqual({ providerId: "resend-1" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(RESEND_API_URL);
    expect((init!.headers as Record<string, string>)["Idempotency-Key"]).toBe("outbox-1");
    expect(JSON.parse(String(init!.body))).toMatchObject({
      from: '"Herzliah Alumni Network" <noreply@alumninetwork.ca>',
      to: ["ari@example.test"],
      reply_to: "alumni@herzliah.test",
    });
    fetchMock.mockRestore();
    vi.unstubAllEnvs();
  });

  it("marks a rejected address as permanent and a server error as retryable", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM_DOMAIN", "alumninetwork.ca");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const email = {
      id: "o",
      to: "a@b.test",
      fromName: "n",
      replyTo: null,
      subject: "s",
      text: "t",
      html: "h",
    };
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 422 }));
    await expect(resendTransport()(email)).rejects.toBeInstanceOf(PermanentEmailError);
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 }));
    const retryable = resendTransport()(email);
    await expect(retryable).rejects.toThrow("Resend responded 503");
    await expect(retryable).rejects.not.toBeInstanceOf(PermanentEmailError);
    fetchMock.mockRestore();
    vi.unstubAllEnvs();
  });

  it("counts a 409 for a key Resend already accepted as sent, and retries one still in progress", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM_DOMAIN", "alumninetwork.ca");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const email = {
      id: "o",
      to: "a@b.test",
      fromName: "n",
      replyTo: null,
      subject: "s",
      text: "t",
      html: "h",
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({ name: "invalid_idempotent_request" }, { status: 409 }),
    );
    await expect(resendTransport()(email)).resolves.toEqual({ providerId: null });
    fetchMock.mockResolvedValueOnce(
      Response.json({ name: "concurrent_idempotent_requests" }, { status: 409 }),
    );
    await expect(resendTransport()(email)).rejects.toThrow("Resend responded 409");
    expect(fetchMock.mock.calls[0]![1]!.signal).toBeInstanceOf(AbortSignal);
    fetchMock.mockRestore();
    vi.unstubAllEnvs();
  });
});
