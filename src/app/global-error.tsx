"use client";

import "./globals.css";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translations } from "@/lib/i18n";

// Replaces the root layout when the layout itself fails, for instance when the nav bar cannot read the database
// (FND-14). Nothing of the layout is left, not the school's colours nor the language, so it says it in both.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const en = translations.en.errors;
  const fr = translations.fr.errors;
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span
            aria-hidden="true"
            className="mb-3 grid size-14 place-items-center rounded-full bg-primary-soft text-primary"
          >
            <TriangleAlert className="size-7" strokeWidth={2} />
          </span>
          <h1 className="m-0 text-3xl font-extrabold text-balance text-foreground">
            {en.errorTitle}
          </h1>
          <p className="m-0 text-md text-pretty text-muted-foreground">{en.errorBody}</p>
          <h2 lang="fr" className="m-0 mt-4 text-xl font-bold text-balance text-foreground">
            {fr.errorTitle}
          </h2>
          <p lang="fr" className="m-0 text-md text-pretty text-muted-foreground">
            {fr.errorBody}
          </p>
          <Button className="mt-5" onClick={() => retry()}>
            {en.tryAgain} · <span lang="fr">{fr.tryAgain}</span>
          </Button>
        </main>
      </body>
    </html>
  );
}
