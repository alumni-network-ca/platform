"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui/button";
import { format } from "@/lib/i18n";

/**
 * The body of an error.tsx boundary (FND-14): says the page did not load, offers to try again, and shows the
 * reference that matches the server's log. The message itself is never shown: in production it is generic.
 */
export function ErrorState({
  error,
  retry,
  inShell = false,
}: {
  error: unknown;
  retry: () => void;
  inShell?: boolean;
}) {
  const { t } = useLanguage();
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusPage
      icon={TriangleAlert}
      eyebrow={t.errors.errorEyebrow}
      title={t.errors.errorTitle}
      inShell={inShell}
      actions={
        <>
          <Button onClick={() => retry()}>{t.errors.tryAgain}</Button>
          <Button asChild variant="secondary">
            <Link href="/">{t.errors.goHome}</Link>
          </Button>
        </>
      }
    >
      <p>{t.errors.errorBody}</p>
      {digest && (
        <p className="mt-3 text-sm text-subtle-foreground">
          {format(t.errors.reference, { digest })}
        </p>
      )}
    </StatusPage>
  );
}
