import "server-only";
import type { Enums } from "@/lib/database";
import type { createClient } from "@/lib/supabase/server";
import { schoolUrl } from "@/lib/tenant/address";
import { getOrigin } from "@/lib/tenant/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Invitation =
  | { status: "invalid" }
  | {
      status: "open" | "expired" | "revoked" | "accepted";
      role: Enums<"member_role">;
      email: string;
      /** Null when a platform admin sent it (a school's first admin). */
      inviterName: string | null;
      invitedAt: string;
      expiresAt: string;
      /** When it was accepted or revoked. */
      endedAt: string | null;
    };

const STATUSES = ["open", "expired", "revoked", "accepted"] as const;

/** An invitation's page at its school's address, for the person who sends it by hand while emails are not sent. */
export async function invitationUrl(slug: string, token: string) {
  // TODO(EML-01): the outbox worker emails this link instead.
  const link = new URL(schoolUrl(await getOrigin(), slug, "/staff/accept"));
  link.searchParams.set("token", token);
  return link.toString();
}

/**
 * What an invitation link shows before anyone signs in (staff_invitation_preview, docs/design/staff-invite.md §1).
 * A link for another school reads as unknown at this address. Accepting is still checked by the database.
 */
export async function previewInvitation(
  supabase: Supabase,
  token: string,
  schoolId: string,
): Promise<Invitation> {
  if (!token) return { status: "invalid" };
  const { data, error } = await supabase.rpc("staff_invitation_preview", { p_token: token });
  if (error) throw new Error(`Could not read the invitation: ${error.message}`);
  const row = data?.[0];
  const status = STATUSES.find((s) => s === row?.status);
  if (!row || !status || row.institution_id !== schoolId) return { status: "invalid" };
  return {
    status,
    role: row.role,
    email: row.email,
    inviterName: row.inviter_name,
    invitedAt: row.invited_at,
    expiresAt: row.expires_at,
    endedAt: row.ended_at,
  };
}
