"use client";

import { useActionState } from "react";
import { acceptInvitation, type AcceptResult } from "./actions";

export function AcceptForm({
  token,
  t,
}: {
  token: string;
  t: { accept: string; accepting: string; failed: string };
}) {
  const [result, action, pending] = useActionState<AcceptResult, FormData>(
    async (previous, form) => {
      const result = await acceptInvitation(previous, form);
      // Reload so the proxy and account guards read the newly granted role at this school's host.
      if (result.next) window.location.assign(result.next);
      return result;
    },
    {
      failed: false,
    },
  );
  return (
    <form action={action} className="authForm">
      <input type="hidden" name="token" value={token} />
      <button className="btn btnPrimary" disabled={pending}>
        {pending ? t.accepting : t.accept}
      </button>
      {result.failed && (
        <div className="notice" role="alert">
          {t.failed}
        </div>
      )}
    </form>
  );
}
