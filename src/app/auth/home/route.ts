import { type NextRequest } from "next/server";
import { getAccount } from "@/lib/auth/account";
import { canOpen, homeFor } from "@/lib/auth/home";
import { safeNext } from "@/lib/auth/next";

// The redirect is relative: request.url carries the server's own hostname rather than the school's address,
// so an absolute URL built from it would send people off their school's subdomain.
const redirectTo = (path: string) =>
  new Response(null, { status: 303, headers: { Location: path } });

// Where sign-in lands (ADR 0014): the ?next= page when it is on this site and the person may open it,
// otherwise their home page at this school.
export async function GET(request: NextRequest) {
  const { user, state } = await getAccount();
  if (!user) return redirectTo("/login");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  return redirectTo(next && canOpen(state, next) ? next : homeFor(state));
}
