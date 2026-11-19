"use server";

import { requireAccess } from "@/lib/auth/account";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Show email" / "Show phone" (CON-02): one value for one profile, through initiate_contact, which checks the
 * caller, logs the contact (once a day per person and channel) and refuses anything not published (CON-01).
 */
export async function revealContact(
  profileId: string,
  channel: "email" | "phone",
): Promise<{ value: string } | { error: true }> {
  if (!UUID.test(profileId) || (channel !== "email" && channel !== "phone")) return { error: true };
  const { supabase } = await requireAccess(`/profile/${profileId}`);
  const { data, error } = await supabase.rpc("initiate_contact", {
    p_profile: profileId,
    p_channel: channel,
  });
  return error || !data ? { error: true } : { value: data };
}
