import { expect, test } from "@playwright/test";
import { blockingViolations } from "./fixtures/a11y";

test.describe("landing page", () => {
  test("renders the hero with a document language", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", /^(en|fr)/);
  });

  test("never sends alumni names to a signed-out visitor", async ({ request }) => {
    const html = await (await request.get("/")).text();
    for (const name of ["Dana Kessler", "Aaron Segal", "Rachel Berger"]) {
      expect(html).not.toContain(name);
    }
  });

  test("has no serious or critical accessibility violations", async ({ page }) => {
    await page.goto("/");
    expect(await blockingViolations(page)).toEqual([]);
  });
});
