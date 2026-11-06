import type { Locale } from "@/lib/i18n";
import { Check } from "lucide-react";

export function JoinProgress({ step, locale }: { step: 0 | 1 | 2; locale: Locale }) {
  const labels =
    locale === "fr"
      ? ["Créer un compte", "Demander l'accès", "Vérification par l'école"]
      : ["Create account", "Request access", "School review"];
  return (
    <ol
      className="joinProgress"
      aria-label={locale === "fr" ? "Rejoindre le réseau" : "Joining the network"}
    >
      {labels.map((label, index) => (
        <li key={label} aria-current={index === step ? "step" : undefined}>
          <span
            className={`joinDot${index < step ? " joinDone" : index === step ? " joinCurrent" : ""}`}
            aria-hidden="true"
          >
            {index < step ? <Check className="size-4" strokeWidth={3} /> : index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}
