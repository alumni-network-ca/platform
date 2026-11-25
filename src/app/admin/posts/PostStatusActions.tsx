"use client";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PostState } from "@/lib/posts/posts";
import { archivePost, deletePost, unpublishPost } from "./actions";
import type { PostsCopy } from "./PostForm";

type Kind = "unpublish" | "archive" | "delete";

/** Unpublish, archive or delete a post, each after a confirmation: alumni lose the post, and waiting emails go. */
export function PostStatusActions({
  id,
  state,
  t,
}: {
  id: string;
  state: PostState;
  t: PostsCopy;
}) {
  const [asking, setAsking] = useState<Kind | null>(null);
  const [pending, start] = useTransition();
  const opener = useRef<HTMLButtonElement | null>(null);
  const actions: Record<Kind, (form: FormData) => Promise<void>> = {
    unpublish: unpublishPost,
    archive: archivePost,
    delete: deletePost,
  };
  const copy: Record<Kind, { label: string; title: string; body: string }> = {
    unpublish: { label: t.unpublish, title: t.unpublishTitle, body: t.unpublishBody },
    archive: { label: t.archive, title: t.archiveTitle, body: t.archiveBody },
    delete: { label: t.deleteDraft, title: t.deleteTitle, body: t.deleteBody },
  };
  const shown: Kind[] =
    state === "draft" ? ["delete"] : state === "archived" ? [] : ["unpublish", "archive"];
  if (!shown.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((kind) => (
        <Button
          key={kind}
          type="button"
          size="sm"
          variant={kind === "unpublish" ? "secondary" : "destructive-outline"}
          loading={pending && asking === kind}
          onClick={(e) => {
            opener.current = e.currentTarget;
            setAsking(kind);
          }}
        >
          {copy[kind].label}
        </Button>
      ))}
      {asking && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && !pending && setAsking(null)}
          title={copy[asking].title}
          description={copy[asking].body}
          confirmLabel={copy[asking].label}
          cancelLabel={t.cancel}
          destructive={asking !== "unpublish"}
          returnFocus={opener}
          onConfirm={() => {
            const form = new FormData();
            form.set("id", id);
            start(() => actions[asking](form));
          }}
        />
      )}
    </div>
  );
}
