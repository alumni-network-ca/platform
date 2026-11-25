import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth/account";
import { isHttpsUrl } from "@/lib/posts/posts";

// The outbound button of a fundraising post (POST-03): records the click (POST-01: once per alumnus, post and day,
// never shown to the school yet) and sends the reader on to the campaign. Recording must never stand in the way:
// if it fails for any other reason than "you may not read this post", the reader still goes, by the address they
// can read through RLS.

const notFound = () => new NextResponse(null, { status: 404 });

function away(url: string) {
  const response = NextResponse.redirect(url, 303);
  // The campaign never learns which page of the private network the reader came from.
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return notFound();
  const { supabase, school } = await requireAccess(`/posts/${id}/go`);

  const { data: url, error } = await supabase.rpc("record_post_click", { p_post: id });
  if (!error && typeof url === "string" && isHttpsUrl(url)) return away(url);
  if (error?.code === "42501") return notFound();
  if (error) console.error(`[posts] recording a click on ${id} failed`, error.code);

  const { data } = await supabase
    .from("school_posts")
    .select("external_url")
    .eq("id", id)
    .eq("institution_id", school.id)
    .eq("kind", "fundraising")
    .eq("status", "published")
    .maybeSingle();
  return data?.external_url && isHttpsUrl(data.external_url) ? away(data.external_url) : notFound();
}
