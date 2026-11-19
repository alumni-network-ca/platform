// Reads the codes the local Supabase Auth sends to Mailpit (http://127.0.0.1:54324).
import { stack } from "./session";

const search = (email: string) =>
  `${stack.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`;

/** Deletes every message sent to an address, so the next code read is the new one. */
export async function clearInbox(email: string) {
  await fetch(search(email), { method: "DELETE" });
}

/** The 6-digit code in the newest message to an address, waiting up to 10 seconds for it to arrive. */
export async function codeFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const { messages } = (await (await fetch(search(email))).json()) as {
      messages: { Subject: string }[];
    };
    const code = messages[0]?.Subject.match(/\b\d{6}\b/)?.[0];
    if (code) return code;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No code arrived for ${email}`);
}

/** A fresh address for a test that signs up, unique per run and per browser project. */
export function newAddress(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

/** The real confirmation/recovery link rendered by the local Auth email template. */
export async function authLinkFor(email: string, flow: "signup" | "recovery"): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const { messages } = (await (await fetch(search(email))).json()) as {
      messages: { ID: string }[];
    };
    for (const message of messages ?? []) {
      const body = (await (
        await fetch(stack.mailpitUrl + "/api/v1/message/" + message.ID)
      ).json()) as { HTML: string };
      const links = [...(body.HTML ?? "").matchAll(/href="([^"]+)"/g)].map((match) =>
        match[1]!.replaceAll("&amp;", "&"),
      );
      const link = links.find(
        (link) => link.includes("/auth/confirm?") && link.includes("flow=" + flow),
      );
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("No " + flow + " link arrived for " + email);
}
