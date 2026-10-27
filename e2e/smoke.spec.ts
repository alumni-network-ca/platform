import { expect, test } from "@playwright/test";
import { blockingViolations } from "./fixtures/a11y";

test.describe("landing page", () => {
  test("renders the hero with a document language", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", /^(en|fr)/);
  });

  test("has no serious or critical accessibility violations", async ({ page }) => {
    await page.goto("/");
    expect(await blockingViolations(page)).toEqual([]);
  });
});
