"use client";

import { ErrorState } from "@/components/ErrorState";

// A page that failed to render, under the nav bar (FND-14). Errors in the root layout go to global-error.tsx.
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} />;
}
