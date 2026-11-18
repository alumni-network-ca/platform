"use client";

import { useActionState } from "react";
import { saveFeatures, type FeaturesResult } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ui } from "@/components/admin/parts";
import type { Locale, translations } from "@/lib/i18n";
import { FEATURES, type FeatureKey } from "@/lib/tenant/features";

type Copy = (typeof translations)[Locale]["consoleFeatures"];

/** SA-07: the features this school has. One card per feature, saved together. */
export function FeaturesForm({
  slug,
  enabled,
  t,
}: {
  slug: string;
  enabled: FeatureKey[];
  t: Copy;
}) {
  const [result, action, pending] = useActionState<FeaturesResult, FormData>(saveFeatures, {
    error: null,
  });

  return (
    <form action={action} className={ui.formStack}>
      <input type="hidden" name="slug" value={slug} />
      {FEATURES.map((key) => (
        <label key={key} className={ui.choice}>
          <input
            type="checkbox"
            name="features"
            value={key}
            defaultChecked={enabled.includes(key)}
          />
          <span>
            <strong>{t[key]}</strong>
            <span className={ui.cellSub}>{t[`${key}Hint`]}</span>
          </span>
        </label>
      ))}
      {result.error && (
        <Alert variant="error" role="alert">
          {t[result.error]}
        </Alert>
      )}
      {result.saved && !pending && (
        <Alert variant="success" role="status">
          {t.saved}
        </Alert>
      )}
      <div className={ui.formActions}>
        <Button loading={pending}>{pending ? t.saving : t.save}</Button>
      </div>
    </form>
  );
}
