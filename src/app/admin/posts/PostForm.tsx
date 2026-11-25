"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { format } from "@/lib/i18n";
import { POST_LIMITS, isHttpsUrl, type PostKind, type PostState } from "@/lib/posts/posts";
import type { translations } from "@/lib/i18n";
import { CoverField } from "@/components/posts/CoverField";
import { PostEditor } from "@/components/posts/PostEditor";
import { ui } from "@/components/admin/parts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { savePost, type PostFormState } from "./actions";

export type PostsCopy = (typeof translations)["en" | "fr"]["posts"];

export type PostFormValues = {
  id: string | null;
  kind: PostKind;
  title: string;
  body: unknown;
  summary: string;
  externalUrl: string;
  goalNote: string;
  endsOn: string;
  coverPath: string | null;
  coverUrl: string | null;
  state: PostState;
  /** "YYYY-MM-DDTHH:mm" in the school's zone: the scheduled time, or a suggestion for a new schedule. */
  publishAt: string;
  /** When the post is scheduled or live: its date, for the "keep" choice. */
  publishLabel: string | null;
  notifiedLabel: string | null;
};

/** The news editor and the fundraising form (design A7.2, A7.3), with the publishing panel beside them. */
export function PostForm({
  values,
  schoolId,
  t,
}: {
  values: PostFormValues;
  schoolId: string;
  t: PostsCopy;
}) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(savePost, {
    error: null,
  });
  const [when, setWhen] = useState<"keep" | "now" | "schedule">("keep");
  const [summary, setSummary] = useState(values.summary);
  const [url, setUrl] = useState(values.externalUrl);
  const [urlTouched, setUrlTouched] = useState(false);
  const news = values.kind === "news";
  const archived = values.state === "archived";
  const live = values.state === "published" || values.state === "scheduled";
  const badUrl = (urlTouched || state.error === "link") && !isHttpsUrl(url.trim());
  const fieldError = (key: PostFormState["error"]) => state.error === key;

  const keepLabel =
    values.state === "draft"
      ? t.keepDraft
      : values.state === "scheduled"
        ? format(t.keepSchedule, { date: values.publishLabel ?? "" })
        : t.keepLive;
  const submitLabel =
    when === "now"
      ? t.publishButton
      : when === "schedule"
        ? t.scheduleButton
        : values.state === "draft"
          ? t.saveDraft
          : t.saveChanges;
  // A post notifies once; for one already live or scheduled, the box can still send it now (once).
  const canNotify = !values.notifiedLabel && !archived && (when !== "keep" || live);

  return (
    <form action={action} className="flex flex-wrap items-start gap-5">
      <input type="hidden" name="id" value={values.id ?? ""} />
      <input type="hidden" name="kind" value={values.kind} />

      <section className={cn(ui.panel, "min-w-0 flex-[999_1_520px] gap-5")}>
        <label className={ui.field}>
          {t.title}
          <Input
            name="title"
            required
            maxLength={POST_LIMITS.title}
            defaultValue={values.title}
            aria-invalid={fieldError("title") || undefined}
            className="text-md font-bold"
          />
        </label>

        <CoverField
          name="cover_path"
          schoolId={schoolId}
          kind={values.kind}
          initialPath={values.coverPath}
          initialUrl={values.coverUrl}
          t={t}
        />

        {news ? (
          <div className="flex flex-col gap-1.5">
            <span id="post-body-label" className="text-sm font-semibold">
              {t.story}
            </span>
            <PostEditor
              name="body"
              initial={values.body}
              labelledBy="post-body-label"
              describedBy="post-body-hint"
              invalid={fieldError("body")}
              t={t}
            />
            <span id="post-body-hint" className={ui.fieldHint}>
              {t.storyHint}
            </span>
          </div>
        ) : (
          <>
            <label className={ui.field}>
              {t.description}
              <Textarea
                name="summary"
                required
                rows={4}
                maxLength={POST_LIMITS.summary}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                aria-invalid={fieldError("description") || undefined}
                aria-describedby="post-summary-count"
              />
              <span id="post-summary-count" className={cn(ui.fieldHint, "self-end tabular-nums")}>
                {format(t.characters, { count: summary.length, max: POST_LIMITS.summary })}
              </span>
            </label>
            <label className={ui.field}>
              {t.donationLink}
              <Input
                name="external_url"
                type="url"
                inputMode="url"
                required
                maxLength={POST_LIMITS.url}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setUrlTouched(true)}
                aria-invalid={badUrl || undefined}
                aria-describedby="post-link-hint post-link-error"
              />
              {badUrl && (
                <span id="post-link-error" className="text-sm font-semibold text-destructive">
                  {t.httpsError}
                </span>
              )}
              <span id="post-link-hint" className={ui.fieldHint}>
                {t.donationLinkHint}
              </span>
            </label>
            <div className={ui.formRow}>
              <label className={ui.field}>
                <span>
                  {t.goalNote}{" "}
                  <span className="font-normal text-muted-foreground">{t.optional}</span>
                </span>
                <Input
                  name="goal_note"
                  maxLength={POST_LIMITS.goalNote}
                  defaultValue={values.goalNote}
                  aria-invalid={fieldError("goal") || undefined}
                />
                <span className={ui.fieldHint}>{t.goalHint}</span>
              </label>
              <label className={ui.field}>
                <span>
                  {t.endDate}{" "}
                  <span className="font-normal text-muted-foreground">{t.optional}</span>
                </span>
                <Input
                  name="ends_on"
                  type="date"
                  defaultValue={values.endsOn}
                  aria-invalid={fieldError("endDate") || fieldError("ended") || undefined}
                />
                <span className={ui.fieldHint}>{t.endHint}</span>
              </label>
            </div>
          </>
        )}
      </section>

      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
        <section className={cn(ui.panel, "gap-3.5 px-5 py-5")}>
          <h2>{t.publishing}</h2>
          {archived ? (
            <p className="text-sm text-subtle-foreground">{t.archivedNote}</p>
          ) : (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2 text-sm font-semibold">{t.when}</legend>
              {(
                [
                  ["keep", keepLabel],
                  ["now", t.publishNow],
                  ["schedule", values.state === "scheduled" ? t.reschedule : t.schedule],
                ] as const
              )
                // A live post has no "publish now" of its own: it is already published.
                .filter(([key]) => !(key === "now" && values.state === "published"))
                .map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2.5 text-base">
                    <input
                      type="radio"
                      name="when"
                      value={key}
                      checked={when === key}
                      onChange={() => setWhen(key)}
                      className="size-4 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              {when === "schedule" && (
                <label className={cn(ui.field, "pl-6.5")}>
                  {t.scheduleAt}
                  <Input
                    name="publish_at"
                    type="datetime-local"
                    required
                    defaultValue={values.publishAt}
                    aria-invalid={fieldError("schedule") || undefined}
                    aria-describedby="post-zone-hint"
                  />
                  <span id="post-zone-hint" className={ui.fieldHint}>
                    {t.timeZoneHint}
                  </span>
                </label>
              )}
            </fieldset>
          )}
          {values.notifiedLabel ? (
            <p className="border-t border-border-subtle pt-3 text-sm text-subtle-foreground">
              {format(t.notified, { date: values.notifiedLabel })}
            </p>
          ) : (
            !archived && (
              <label
                className={cn(
                  "flex items-start gap-2.5 border-t border-border-subtle pt-3 text-base",
                  !canNotify && "opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  name="notify"
                  disabled={!canNotify}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="font-semibold">{t.notify}</span>
                  <span className="block text-sm text-muted-foreground">{t.notifyHint}</span>
                </span>
              </label>
            )
          )}
        </section>

        {state.error && (
          <Alert variant="error" role="alert">
            {t.errors[state.error]}
          </Alert>
        )}
        <div className="flex flex-col gap-2.5">
          <Button loading={pending} className="w-full">
            {submitLabel}
          </Button>
          {values.id && (
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/admin/posts/${values.id}/preview`}>{t.preview}</Link>
            </Button>
          )}
        </div>
      </aside>
    </form>
  );
}
