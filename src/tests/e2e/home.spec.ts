import { expect, test } from "@playwright/test";
import { blockingViolations } from "./fixtures/a11y";
import { accounts } from "./fixtures/accounts";
import { addressOf, signInAs } from "./fixtures/session";

// The alumni home page (DIR-06; design Home). tests/unit/lib/home/people.test.ts covers the picks, and
// supabase/tests/database/07_directory_sort.test.sql that the sorts never widen who is returned.

test.describe("alumni home", () => {
  test("welcomes the alumnus, with their class, newcomers and profile", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1, name: /^Welcome back, / })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Home" }),
    ).toHaveAttribute("aria-current", "page");

    const yourClass = page.getByRole("region", { name: /^Your class · Class of \d{4}$/ });
    await expect(yourClass.getByText("See what's new with your classmates")).toBeVisible();
    expect(await yourClass.locator('a[href^="/profile/"]').count()).toBeLessThanOrEqual(3);
    const newcomers = page.getByRole("region", { name: "New in the network" });
    expect(await newcomers.locator('a[href^="/profile/"]').count()).toBeLessThanOrEqual(3);

    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "People you contacted" })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });

  test("searching goes to the directory", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/home");
    await page.getByRole("searchbox", { name: "Search alumni" }).fill("Levy");
    await page.getByRole("search").getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/directory?q=Levy"));
  });

  test("is only for alumni who finished onboarding", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.pending);
    await page.goto("/home");
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/account/pending"));
  });
});
