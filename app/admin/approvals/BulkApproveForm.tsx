"use client";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { approveRequests, type BulkItem, type BulkResult } from "./actions";
import { errorMessage, type AdminCopy } from "@/lib/admin/forms";
import type { BulkSkipReason } from "@/lib/database";
import { format } from "@/lib/i18n";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ALL_BOX, ROW_BOX } from "./bulk";

/**
 * ONB-08: wraps the pending table for school admins. The server renders the checkboxes; this counts them, asks
 * before approving, and shows what was approved and what was skipped. The database decides what is skipped.
 */
export function BulkApproveForm({
  t,
  children,
  hasRows = true,
  action = approveRequests,
}: {
  t: AdminCopy;
  children: ReactNode;
  /** False once the queue is empty: the summary stays, the selection bar goes. */
  hasRows?: boolean;
  action?: (state: BulkResult, form: FormData) => Promise<BulkResult>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [count, setCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const approve = useRef<HTMLButtonElement>(null);
  const summary = useRef<HTMLDivElement>(null);

  const boxes = () => [
    ...(form.current?.querySelectorAll<HTMLInputElement>(`input[name="${ROW_BOX}"]`) ?? []),
  ];
  const recount = () => {
    const all = boxes();
    const ticked = all.filter((b) => b.checked).length;
    const head = form.current?.querySelector<HTMLInputElement>(`input[name="${ALL_BOX}"]`);
    if (head) {
      head.checked = all.length > 0 && ticked === all.length;
      head.indeterminate = ticked > 0 && ticked < all.length;
    }
    setCount(ticked);
  };

  // A new result: the approved rows have left the table, so start again from nothing ticked and show the summary.
  const done = state.approved !== undefined;
  const [shown, setShown] = useState(state);
  if (state !== shown) {
    setShown(state);
    if (done) setCount(0);
  }
  useEffect(() => {
    if (!done) return;
    form.current?.reset();
    const head = form.current?.querySelector<HTMLInputElement>(`input[name="${ALL_BOX}"]`);
    if (head) head.indeterminate = false;
    summary.current?.focus();
  }, [state, done]);

  const name = (item: BulkItem) => item.name || t.bulkUnknownRequest;
  const reasons: Record<BulkSkipReason, string> = {
    possible_match: t.skipPossibleMatch,
    has_profile: t.skipHasProfile,
    not_pending: t.skipNotPending,
    not_allowed: t.skipNotAllowed,
    failed: t.skipFailed,
  };
  const approved = state.approved ?? [];
  const skipped = state.skipped ?? [];

  return (
    <form
      ref={form}
      action={formAction}
      className="flex flex-col gap-3"
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (target.name === ALL_BOX) for (const b of boxes()) b.checked = target.checked;
        recount();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (count) setConfirming(true);
      }}
    >
      {state.error && (
        <Alert variant="error" role="alert">
          {errorMessage(state.error, t)}
        </Alert>
      )}
      {(approved.length > 0 || skipped.length > 0) && (
        <Alert
          ref={summary}
          tabIndex={-1}
          variant={approved.length ? "success" : "warning"}
          role="status"
          className="outline-none"
        >
          <p className="font-bold">
            {format(t.bulkSummary, { approved: approved.length, skipped: skipped.length })}
          </p>
          {approved.length > 0 && (
            <p>
              <strong>{t.bulkApprovedList}</strong> {approved.map(name).join(", ")}
            </p>
          )}
          {skipped.length > 0 && (
            <>
              <p className="font-bold">{t.bulkSkippedList}</p>
              <ul className="list-disc pl-5">
                {skipped.map((s) => (
                  <li key={s.id}>
                    {name(s)}: {s.reason ? reasons[s.reason] : t.skipFailed}
                    {s.reason !== "not_allowed" && (
                      <>
                        {" · "}
                        <Link href={"/admin/approvals/" + s.id}>{t.review}</Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Alert>
      )}
      {hasRows && (
        <div
          className={
            count
              ? "flex min-h-11 flex-wrap items-center justify-between gap-2.5 rounded-md bg-primary-soft px-3 py-1.5"
              : "flex min-h-11 items-center"
          }
        >
          <p aria-live="polite" className="text-sm">
            {count ? (
              <>
                <strong>{format(t.selectedCount, { count })}</strong>
                {" · "}
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    form.current?.reset();
                    recount();
                  }}
                >
                  {t.clearSelection}
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">{t.bulkHint}</span>
            )}
          </p>
          {count > 0 && (
            <Button ref={approve} type="submit" size="sm" loading={pending}>
              {format(t.approveSelected, { count })}
            </Button>
          )}
        </div>
      )}
      {children}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={count === 1 ? t.bulkConfirmTitleOne : format(t.bulkConfirmTitle, { count })}
        description={t.bulkConfirmBody}
        confirmLabel={count === 1 ? t.bulkConfirmButtonOne : format(t.bulkConfirmButton, { count })}
        cancelLabel={t.cancel}
        returnFocus={approve}
        onConfirm={() => {
          if (!form.current) return;
          const data = new FormData(form.current);
          startTransition(() => formAction(data));
        }}
      />
    </form>
  );
}
