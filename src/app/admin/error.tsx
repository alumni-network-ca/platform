"use client";

import { ErrorState } from "@/components/ErrorState";

// An admin page that failed to render, inside the shell so the admin menu stays (FND-14).
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} inShell />;
}
