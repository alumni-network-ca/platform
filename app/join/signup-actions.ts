"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MIN_PASSWORD_LENGTH, SIGNUP_CONFIRMATION } from "@/config/auth";
import { getAccount } from "@/lib/auth/account";
import { authEmailRedirect } from "@/lib/auth/email-links";
import { getOrigin } from "@/lib/tenant/server";
import { homeFor } from "@/lib/auth/home";
import { signupDestination } from "@/lib/auth/next";

export type SignupResult = {
  error: "email" | "weak" | "mismatch" | "tooMany" | "failed" | null;
  next?: string;
  confirmationSent?: boolean;
};
export type ResendResult = { error: "tooMany" | "failed" | null; sent: boolean };
const COOKIE = SIGNUP_CONFIRMATION.cookies;

async function cookieOptions() {
  return {
    httpOnly: true,
    secure: (await getOrigin()).protocol === "https:",
    sameSite: "lax" as const,
    path: SIGNUP_CONFIRMATION.path,
    maxAge: SIGNUP_CONFIRMATION.maxAgeSeconds,
  };
}

export async function createAccount(_: SignupResult, form: FormData): Promise<SignupResult> {
  const { supabase, user, state } = await getAccount();
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await authEmailRedirect("signup", destination) },
  });
  if (error && error.code !== "user_already_exists")
    return {
      error: error.status === 429 ? "tooMany" : error.code === "weak_password" ? "weak" : "failed",
    };
  // Supports environments with auto-confirmation; membership still requires school approval.
  if (data.session?.user.email_confirmed_at)
    return { error: null, next: `/auth/home?next=${encodeURIComponent(destination)}` };
  const store = await cookies();
  const options = await cookieOptions();
  store.set(COOKIE.email, email, options);
  store.set(COOKIE.sent, String(Date.now()), options);
  store.set(COOKIE.next, destination, options);
  return { error: null, confirmationSent: true };
}

export async function resendConfirmation(): Promise<ResendResult> {
  const { supabase, user, state } = await getAccount();
  if (user) redirect(homeFor(state));
  const store = await cookies();
  const email = store.get(COOKIE.email)?.value;
  const destination = signupDestination(store.get(COOKIE.next)?.value);
  if (!email) return { error: "failed", sent: false };
  const lastSent = Number(store.get(COOKIE.sent)?.value ?? 0);
  if (Date.now() - lastSent < SIGNUP_CONFIRMATION.resendCooldownMs)
    return { error: "tooMany", sent: false };
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: await authEmailRedirect("signup", destination) },
  });
  if (error) return { error: error.status === 429 ? "tooMany" : "failed", sent: false };
  store.set(COOKIE.sent, String(Date.now()), await cookieOptions());
  return { error: null, sent: true };
}
