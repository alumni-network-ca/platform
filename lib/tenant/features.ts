import type { SchoolConfig, SchoolFeatures } from "@/lib/database";

// School features (ADR 0021): parts of the product a platform admin switches on for one school, in the console.
// The database keeps the same keys (platform_set_school_features drops any other), so add a key in both places,
// with its label and hint in the consoleFeatures dictionary (lib/i18n.ts).

export type FeatureKey = keyof Required<SchoolFeatures>;

/** Every feature, in the order the console lists them. */
export const FEATURES: readonly FeatureKey[] = ["yeshiva_seminary"];

/** A config cached before features existed has none: every feature is off. */
export const hasFeature = (config: Pick<SchoolConfig, "features">, key: FeatureKey) =>
  config.features?.[key] === true;
