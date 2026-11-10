import { expect, test, type Page } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { signInAs } from "./fixtures/session";

// Loading states (FND-02): on a slow server, a click shows the next page's skeleton at once, under the nav bar that
// stays in place, and the page replaces it when it arrives. The test holds back the server's answer to a client
// navigation to make the wait visible. Prefetches (production only) go through: they bring the skeleton in advance.

/** Holds back every client navigation's server response until release() is called. */
async function holdNavigations(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/*", async (route) => {
    const headers = route.request().headers();
    const prefetch = headers["next-router-prefetch"] || headers["next-router-segment-prefetch"];
    if (headers["rsc"] === "1" && !prefetch) await gate;
    await route.continue();
  });
  return release;
}

const loading = (page: Page) => page.getByRole("status").filter({ hasText: "Loading…" });

test.describe("loading states", () => {
  // Skeletons come from prefetched loading.tsx files, which `next dev` does not prefetch.
  test.skip(!process.env.CI, "needs the production server (CI=1)");

  test("the directory shows its skeleton under the nav bar while it loads", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/home");
    const nav = page.getByRole("banner");
    await expect(nav.getByRole("link", { name: "Directory", exact: true })).toBeVisible();
    // Let the prefetch of the directory's loading state land before holding the navigation.
    await page.waitForLoadState("networkidle");
    const release = await holdNavigations(page);

    await nav.getByRole("link", { name: "Directory", exact: true }).click();
    await expect(loading(page)).toBeAttached();
    await expect(page.locator("main[aria-busy=true]")).toBeVisible();
    await expect(nav).toBeVisible();

    release();
    await expect(page.getByRole("heading", { level: 1, name: /^Find .* alumni$/ })).toBeVisible();
    await expect(loading(page)).toHaveCount(0);
  });

  test("an admin section shows its skeleton beside the admin menu", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.admin);
    await page.goto("/admin");
    const menu = page.getByRole("navigation", { name: "Dashboard" });
    await expect(menu.getByRole("link", { name: "Alumni" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const release = await holdNavigations(page);

    await menu.getByRole("link", { name: "Alumni" }).click();
    await expect(loading(page)).toBeAttached();
    await expect(page.getByRole("main").locator("[data-slot=skeleton]").first()).toBeVisible();
    await expect(menu).toBeVisible();

    release();
    await expect(page.getByRole("heading", { level: 1, name: "Alumni" })).toBeVisible();
    await expect(loading(page)).toHaveCount(0);
  });

  test("changing a directory filter keeps the filters and marks the results busy", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/directory");
    const results = page.getByRole("region", { name: "Results" });
    await expect(results).toBeVisible();
    await page.waitForLoadState("networkidle");
    const release = await holdNavigations(page);

    await page.getByRole("combobox", { name: "Sort by" }).selectOption("name");
    await expect(results).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("searchbox", { name: "Search alumni" })).toBeVisible();
    await expect(loading(page)).toHaveCount(0);

    release();
    await expect(page).toHaveURL(/sort=name/);
    await expect(results).not.toHaveAttribute("aria-busy");
  });
});
