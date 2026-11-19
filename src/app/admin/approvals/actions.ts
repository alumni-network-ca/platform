"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { actionError, type ActionResult } from "@/lib/admin/forms";
import { sendQueuedEmails } from "@/lib/email/send";
import type { BulkSkipReason } from "@/lib/database";

export type BulkItem = { id: string; name: string; reason?: BulkSkipReason };
export type BulkResult = ActionResult & { approved?: BulkItem[]; skipped?: BulkItem[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 200;

/** ONB-08: approve the ticked pending requests. Anything that needs a human look comes back as skipped. */
export async function approveRequests(_: BulkResult, form: FormData): Promise<BulkResult> {
  const { supabase, school } = await requireStaff("/admin/approvals", "requests.bulkapprove");
  const ids = [...new Set(form.getAll("id").map((v) => String(v).trim()))];
  if (!ids.length || ids.length > MAX || !ids.every((id) => UUID.test(id)))
    return { error: "invalid" };

  // The school comes from the address, never from the ids: only this school's requests go to the database.
  const { data: rows, error: lookupError } = await supabase
    .from("access_requests")
    .select("id, first_name, last_name")
    .eq("institution_id", school.id)
    .in("id", ids);
  if (lookupError) return actionError(lookupError);
  const names = new Map(rows.map((r) => [r.id, `${r.first_name} ${r.last_name}`]));
  const outside = ids.filter((id) => !names.has(id));

  const results = names.size
    ? await supabase.rpc("approve_access_requests", { p_requests: [...names.keys()] })
    : { data: [], error: null };
  if (results.error) return actionError(results.error);

  const approved: BulkItem[] = [];
  const skipped: BulkItem[] = outside.map((id) => ({ id, name: "", reason: "not_allowed" }));
  for (const row of results.data) {
    const item = { id: row.request_id, name: names.get(row.request_id) ?? "" };
    if (row.outcome === "approved") approved.push(item);
    else skipped.push({ ...item, reason: row.reason });
  }
  // Each approval queued its own email; send them after the response. The sweeper retries any that fail.
  await Promise.all(approved.map((a) => sendQueuedEmails(a.id)));
  if (approved.length) revalidatePath("/admin", "layout");
  return { error: null, approved, skipped };
}
