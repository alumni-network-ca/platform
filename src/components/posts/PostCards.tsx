import { cn } from "@/lib/utils";

// The kind tag and the cover that the posts list (PostTimeline) and a post (PostArticle) share. Strings arrive
// translated; these parts decide nothing.

const KIND_TAG = {
  news: "bg-info-soft text-info",
  fundraising: "bg-primary-soft text-primary",
} as const;

export function KindTag({ kind, label }: { kind: keyof typeof KIND_TAG; label: string }) {
  return (
    <span className={cn("rounded-md px-2.5 py-0.5 text-xs font-bold", KIND_TAG[kind])}>
      {label}
    </span>
  );
}

/**
 * A post's cover. The image is decorative (the title says what the post is), so it has no text alternative. With no
 * image, a band in the school's colours keeps the cards the same shape.
 */
export function Cover({
  src,
  kind,
  className,
}: {
  src: string | null | undefined;
  kind: keyof typeof KIND_TAG;
  className?: string;
}) {
  return src ? (
    // A short-lived signed address from private storage: next/image can't cache it, so a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("aspect-video w-full bg-muted object-cover", className)} />
  ) : (
    <div
      aria-hidden="true"
      className={cn(
        "aspect-video w-full",
        kind === "fundraising"
          ? "bg-[linear-gradient(135deg,var(--color-primary),var(--color-pink))]"
          : "bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))]",
        className,
      )}
    />
  );
}
