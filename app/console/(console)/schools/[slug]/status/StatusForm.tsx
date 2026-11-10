"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { setSchoolStatus, type StatusResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ui } from "@/components/admin/parts";
import { Alert } from "@/components/ui/alert";

export function StatusForm({ slug, suspended }: { slug: string; suspended: boolean }) {
  const [result, action, pending] = useActionState<StatusResult, FormData>(setSchoolStatus, {
    error: null,
  });
  const [typed, setTyped] = useState("");
  const label = suspended ? "Reactivate school" : "Suspend school";

  return (
    <form action={action} className={ui.formStack}>
      <input type="hidden" name="slug" value={slug} />
      {suspended ? (
        <>
          <input type="hidden" name="status" value="active" />
          <p>
            Reactivating opens the school&apos;s address again. Its staff and members get their
            access back on their next page load.
          </p>
        </>
      ) : (
        <fieldset className={ui.formStack} style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className={ui.field}>What do you want to do?</legend>
          <label className={ui.choice}>
            <input type="radio" name="status" value="suspended" defaultChecked />
            <span>
              <strong>Suspend</strong>
              <span className={ui.cellSub}>
                The school&apos;s address stops answering. Nobody can sign in, and its staff lose
                their access. All data is kept, and you can reactivate it at any time.
              </span>
            </span>
          </label>
          <label className={ui.choice}>
            <input type="radio" name="status" value="offboard" disabled />
            <span>
              <strong>Offboard</strong>
              <span className={ui.cellSub}>
                Export the school&apos;s data, then delete it after the retention period (DEC-08).
                Comes with the retention job.
              </span>
            </span>
          </label>
        </fieldset>
      )}
      <label className={ui.field}>
        Reason{suspended ? " (optional)" : ""}
        <Textarea name="reason" rows={2} maxLength={500} required={!suspended} />
        <span className={ui.fieldHint}>Kept in the school&apos;s audit log.</span>
      </label>
      <label className={ui.field}>
        Type {slug} to confirm
        <Input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          required
        />
      </label>
      {result.error && (
        <Alert variant="error" role="alert">
          {result.error}
        </Alert>
      )}
      <div className={ui.formActions}>
        <Button asChild variant="secondary">
          <Link href={`/schools/${slug}`}>Cancel</Link>
        </Button>
        <Button
          variant={suspended ? "default" : "destructive"}
          loading={pending}
          disabled={typed.trim() !== slug}
        >
          {pending ? "Saving…" : label}
        </Button>
      </div>
    </form>
  );
}
