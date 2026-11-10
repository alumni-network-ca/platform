"use server";

import { createHash } from "node:crypto";
import { serverEnv } from "@/config/env/server";
import { resendTransport } from "@/factories/email";
import { getServerTranslations } from "@/lib/i18n-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSchool } from "@/lib/tenant/server";
import { escapeHtml } from "@/utils/html";

export type ContactStatus = "idle" | "sent" | "invalid" | "limited" | "failed";

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendSchoolInquiry(_: ContactStatus, form: FormData): Promise<ContactStatus> {
  const inquiry = field(form, "inquiry");
  const name = field(form, "name");
  const school = field(form, "school");
  const email = field(form, "email");
  const message = field(form, "message");
  if (
    (inquiry !== "demo" && inquiry !== "quote") ||
    !name ||
    name.length > 120 ||
    !school ||
    school.length > 160 ||
    email.length > 254 ||
    !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email) ||
    message.length > 2000 ||
    field(form, "website")
  ) {
    return "invalid";
  }

  try {
    if (await getSchool()) return "invalid";
    const send = resendTransport();
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: "platform_contact",
      p_max: 60,
      p_window: "1 hour",
    });
    if (error) {
      console.error("[school inquiry] rate limit check failed", error.code);
      return "failed";
    }
    if (!data) return "limited";

    const { t } = await getServerTranslations();
    const { contact, demoSubject, quoteSubject } = t.schoolsLanding;
    const subject = inquiry === "demo" ? demoSubject : quoteSubject;
    const to = serverEnv.platformContactEmail;
    const text = [
      `${contact.name}: ${name}`,
      `${contact.school}: ${school}`,
      `${contact.email}: ${email}`,
      message && `\n${message}`,
    ]
      .filter(Boolean)
      .join("\n");
    // The same request keeps its id if a visitor retries after a transport timeout.
    const id = createHash("sha256")
      .update(JSON.stringify([to, subject, text]))
      .digest("hex");
    await send({
      id,
      to,
      fromName: t.nav.platformName,
      replyTo: email,
      subject,
      text,
      html: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
    });
    return "sent";
  } catch (error) {
    console.error("[school inquiry] delivery failed", error instanceof Error ? error.name : "");
    return "failed";
  }
}
