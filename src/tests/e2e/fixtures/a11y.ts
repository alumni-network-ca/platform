import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/** Serious and critical WCAG 2.1 A/AA violations on the page as it is now, one line each. */
export async function blockingViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.nodes.length}): ${v.help}`);
}
