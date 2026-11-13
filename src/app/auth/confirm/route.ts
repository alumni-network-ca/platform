import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signupDestination } from "@/lib/auth/next";

const go = (path: string) =>
  new Response(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });

/** Email links establish a session on this address only; school admission remains a separate RPC. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const recovery = type === "recovery" || params.get("flow") === "recovery";
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const destination = signupDestination(params.get("next"));
  if ((tokenHash && (type === "signup" || type === "recovery")) || code) {
    const supabase = await createClient();
    const { error } =
      tokenHash && (type === "signup" || type === "recovery")
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : await supabase.auth.exchangeCodeForSession(code!);
    if (!error)
      return go(
        recovery ? "/reset-password" : `/auth/home?next=${encodeURIComponent(destination)}`,
      );
  }
  return go(
    recovery
      ? "/forgot-password?error=expired"
      : `/join?confirmation=expired${destination === "/join" ? "" : `&next=${encodeURIComponent(destination)}`}`,
  );
}
