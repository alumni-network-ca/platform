import { StepBar } from "@/components/auth/parts";
import type { Locale } from "@/lib/i18n";

/** Where an applicant is in joining: create the account, request access, the school's review. */
export function JoinProgress({
  step,
  locale,
  compact = false,
}: {
  step: 0 | 1 | 2;
  locale: Locale;
  compact?: boolean;
}) {
  const labels =
    locale === "fr"
      ? ["Créer un compte", "Demander l'accès", "Vérification par l'école"]
      : ["Create account", "Request access", "School review"];
  return (
    <StepBar
      label={locale === "fr" ? "Rejoindre le réseau" : "Joining the network"}
      compact={compact}
      steps={labels.map((label, index) => ({
        label,
        state: index < step ? "done" : index === step ? "current" : "todo",
      }))}
    />
  );
}
