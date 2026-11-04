"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth/account";
import { authEmailRedirect } from "@/lib/auth/email-links";
import { getOrigin } from "@/lib/tenant/server";
import { homeFor } from "@/lib/auth/home";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { invitationToken, signupDestination } from "@/lib/auth/next";
import { previewInvitation } from "@/lib/staff/invitation";

export type SignupResult = {
  error: "email" | "name" | "weak" | "mismatch" | "tooMany" | "failed" | null;
  next?: string;
};
export type ResendResult = { error: "tooMany" | "failed" | null; sent: boolean };
const EMAIL_COOKIE = "alumni-confirmation-email";
const SENT_COOKIE = "alumni-confirmation-sent";
const NEXT_COOKIE = "alumni-confirmation-next";

export async function createAccount(_: SignupResult, form: FormData): Promise<SignupResult> {
  const { school, supabase, user, state } = await getAccount();
  const destination = signupDestination(String(form.get("next") ?? ""));
  if (user)
    return {
      error: null,
      next:
        destination === "/join"
          ? homeFor(state)
          : `/auth/home?next=${encodeURIComponent(destination)}`,
    };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "email" };
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 1024) return { error: "weak" };
  if (password !== form.get("confirm_password")) return { error: "mismatch" };

  // A staff account uses the invited address and keeps the name staff lists show (A6.2). The invitation's own
  // page explains one that can no longer be accepted; accepting checks the address again.
  let metadata: { first_name: string; last_name: string } | undefined;
  if (destination !== "/join") {
    const invitation = await previewInvitation(
      supabase,
      invitationToken(destination) ?? "",
      school.id,
    );
    if (invitation.status !== "open") return { error: null, next: destination };
    if (email.toLowerCase() !== invitation.email) return { error: "email" };
    const first = String(form.get("first_name") ?? "").trim();
    const last = String(form.get("last_name") ?? "").trim();
    if (!first || !last || first.length > 100 || last.length > 100) return { error: "name" };
    metadata = { first_name: first, last_name: last };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await authEmailRedirect("signup", destination),
      ...(metadata && { data: metadata }),
    },
  });
  if (error && error.code !== "user_already_exists")
    return {
      error: error.status === 429 ? "tooMany" : error.code === "weak_password" ? "weak" : "failed",
    };
  // Supports environments with auto-confirmation; membership still requires school approval.
  if (data.session?.user.email_confirmed_at)
    return { error: null, next: `/auth/home?next=${encodeURIComponent(destination)}` };
  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: (await getOrigin()).protocol === "https:",
    sameSite: "lax" as const,
    path: "/join",
    maxAge: 1800,
  };
  store.set(EMAIL_COOKIE, email, options);
  store.set(SENT_COOKIE, String(Date.now()), options);
  store.set(NEXT_COOKIE, destination, options);
  return { error: null, next: "/join/verify" };
}

export async function resendConfirmation(): Promise<ResendResult> {
  const { supabase, user, state } = await getAccount();
  if (user) redirect(homeFor(state));
  const store = await cookies();
  const email = store.get(EMAIL_COOKIE)?.value;
  const destination = signupDestination(store.get(NEXT_COOKIE)?.value);
  if (!email) return { error: "failed", sent: false };
  const lastSent = Number(store.get(SENT_COOKIE)?.value ?? 0);
  if (Date.now() - lastSent < 60_000) return { error: "tooMany", sent: false };
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: await authEmailRedirect("signup", destination) },
  });
  if (error) return { error: error.status === 429 ? "tooMany" : "failed", sent: false };
  store.set(SENT_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: (await getOrigin()).protocol === "https:",
    sameSite: "lax",
    path: "/join",
    maxAge: 1800,
  });
  return { error: null, sent: true };
}
