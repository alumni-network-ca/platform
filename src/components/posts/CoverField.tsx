"use client";
import { useRef, useState } from "react";
import { COVER_BUCKET, COVER_TYPES, POST_LIMITS } from "@/lib/posts/posts";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Cover } from "./PostCards";

export type CoverCopy = {
  cover: string;
  optional: string;
  coverHint: string;
  chooseImage: string;
  replaceImage: string;
  removeImage: string;
  uploading: string;
  coverTooBig: string;
  coverType: string;
  coverFailed: string;
};

/**
 * The cover image of a post (POST-02). The file goes from the browser straight to the school's folder in private
 * storage: a server action would cap it at a few megabytes. The storage policy lets only staff who manage posts
 * write there, and save_post checks the path belongs to the school and the file exists. The path travels in a
 * hidden field named `name`.
 */
export function CoverField({
  name,
  schoolId,
  kind,
  initialPath,
  initialUrl,
  t,
}: {
  name: string;
  schoolId: string;
  kind: "news" | "fundraising";
  initialPath: string | null;
  initialUrl: string | null;
  t: CoverCopy;
}) {
  const [path, setPath] = useState(initialPath ?? "");
  const [preview, setPreview] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    const ext = COVER_TYPES[file.type];
    if (!ext) return setError(t.coverType);
    if (file.size > POST_LIMITS.cover) return setError(t.coverTooBig);
    setBusy(true);
    const next = `${schoolId}/${crypto.randomUUID()}.${ext}`;
    const { error: failed } = await createClient()
      .storage.from(COVER_BUCKET)
      .upload(next, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (failed) return setError(t.coverFailed);
    setPath(next);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold" id={`${name}-label`}>
        {t.cover} <span className="font-normal text-muted-foreground">{t.optional}</span>
      </span>
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="w-40 overflow-hidden rounded-md border">
          <Cover src={preview} kind={kind} />
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={busy}
              onClick={() => input.current?.click()}
              aria-describedby={`${name}-hint`}
            >
              {busy ? t.uploading : path ? t.replaceImage : t.chooseImage}
            </Button>
            {path && !busy && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPath("");
                  setPreview(null);
                }}
              >
                {t.removeImage}
              </Button>
            )}
          </div>
          <span id={`${name}-hint`} className="text-xs text-muted-foreground">
            {t.coverHint}
          </span>
          {error && (
            <span role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </span>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={Object.keys(COVER_TYPES).join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-labelledby={`${name}-label`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <input type="hidden" name={name} value={path} />
    </div>
  );
}
