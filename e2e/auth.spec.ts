import { expect, test, type Page } from "@playwright/test";
import { accounts, LOCAL_PASSWORD } from "./fixtures/accounts";

// Needs the local Supabase stack with the seed applied (`supabase start`).

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(LOCAL_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/directory");
}

test.describe("directory access", () => {
  test("a verified alumnus can sign in and browse the directory", async ({ page }) => {
    await signIn(page, accounts.alumni);
    await expect(page.getByRole("link", { name: /Maya\s+Frenkel/ })).toBeVisible();
    await expect(page.getByText("Hidden Member")).toHaveCount(0);
    await expect(page.getByText("Imported Unclaimed")).toHaveCount(0);
  });

  test("a pending applicant sees no alumni", async ({ page }) => {
    await signIn(page, accounts.pending);
    await expect(page.locator(".emptyState")).toBeVisible();
    await expect(page.locator(".profileCard")).toHaveCount(0);
  });
});
