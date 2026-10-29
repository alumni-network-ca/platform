import { expect, test, type Page } from "@playwright/test";
import { blockingViolations } from "./fixtures/a11y";
import { accounts } from "./fixtures/accounts";
import { addressOf, signInAs } from "./fixtures/session";

// The nav bar on every page (docs/design/nav-bar.md): what each nav role sees, the account menu's keyboard
// behaviour, and accessibility with the menu open. lib/auth/nav.test.ts covers every role's mapping in detail.

const root = (baseURL: string, path = "/") => addressOf(baseURL, null, path);
const accountButton = (page: Page) =>
  page.getByRole("banner").getByRole("button", { name: /^Account menu for/ });
/** Each menu item's label, without its chip. */
const menuItems = (page: Page) =>
  page
    .getByRole("menu")
    .getByRole("menuitem")
    .evaluateAll((items) => items.map((item) => item.firstElementChild?.textContent));
const pill = (page: Page) => page.getByRole("banner").locator(".rolePill");
const mainNav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const navLinks = (page: Page) => mainNav(page).getByRole("link").allTextContents();

test.describe("nav bar", () => {
  test("a signed-out visitor sees the brand, the language switch and sign-in", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: /^Herzliah Alumni Network/ })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    await expect(mainNav(page)).toHaveCount(0);
    await expect(accountButton(page)).toHaveCount(0);
    await expect(pill(page)).toHaveCount(0);
    expect(await blockingViolations(page)).toEqual([]);

    await header.getByRole("button", { name: "FR · Français" }).click();
    await expect(header.getByRole("link", { name: "Se connecter" })).toBeVisible();
    await expect(
      header.getByRole("link", { name: /^Réseau des anciens de Herzliah/ }),
    ).toBeVisible();
  });

  test("an alumnus: Home and Directory, no pill, and a keyboard menu", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/directory");
    expect(await navLinks(page)).toEqual(["Home", "Directory"]);
    await expect(mainNav(page).getByRole("link", { name: "Directory" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(pill(page)).toHaveCount(0);

    const button = accountButton(page);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("menuitem", { name: "My profile" })).toBeFocused();
    expect(await menuItems(page)).toEqual([
      "My profile",
      "Edit profile",
      "Who can see me",
      "Email and sign-in",
      "Language",
      "Download my data",
      "Contact the alumni office",
      "Privacy policy and terms",
      "Sign out",
    ]);
    await expect(page.getByText(/^Class of \d{4} · Verified graduate$/)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);

    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Edit profile" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(button).toBeFocused();

    await button.click();
    // A click in the page margin, below the open menu.
    await page.mouse.click(2, page.viewportSize()!.height - 2);
    await expect(page.getByRole("menu")).toHaveCount(0);

    await button.click();
    await page.getByRole("menuitem", { name: "My profile" }).click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("the menu stays inside the window", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/directory");
    await accountButton(page).click();
    const box = await page.locator(".acctPanel").boundingBox();
    const width = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  });

  test("an applicant: their request, no links and no pill", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.pending);
    await page.goto("/account/pending");
    await expect(mainNav(page)).toHaveCount(0);
    await expect(pill(page)).toHaveCount(0);
    await accountButton(page).click();
    await expect(page.getByText("Request pending with Herzliah")).toBeVisible();
    expect(await menuItems(page)).toEqual([
      "My request",
      "Language",
      "Withdraw my request",
      "Sign out",
    ]);
    await expect(page.getByRole("menuitem", { name: /^My request/ })).toContainText("Pending");
  });

  test("a reviewer: the Admin link with pending sign-ups, and a read-only roster", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.reviewer);
    await page.goto("/admin");
    await expect(pill(page)).toHaveText("Reviewer");
    await expect(mainNav(page).getByRole("link", { name: /^Admin.*pending/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await accountButton(page).click();
    await expect(page.getByRole("group", { name: "Admin" })).toBeVisible();
    expect(await menuItems(page)).toEqual([
      "Dashboard",
      "Approvals",
      "Alumni",
      "Audit log",
      "Two-factor and sign-in",
      "Language",
      "Sign out",
    ]);
    await expect(page.getByRole("menuitem", { name: /^Alumni/ })).toContainText("Read-only");
    expect(await blockingViolations(page)).toEqual([]);
  });

  test("a school admin: every admin page", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.admin);
    await page.goto("/admin");
    await expect(pill(page)).toHaveText("School admin");
    await accountButton(page).click();
    await expect(page.getByText("Herzliah High School", { exact: true })).toBeVisible();
    expect(await menuItems(page)).toEqual([
      "Dashboard",
      "Approvals",
      "Alumni",
      "Staff",
      "School settings",
      "Audit log",
      "Two-factor and sign-in",
      "Language",
      "Sign out",
    ]);
  });

  test("a platform admin on the console: its links, and every school", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, root(baseURL!), accounts.system);
    await page.goto(root(baseURL!, "/console"));
    await expect(pill(page)).toHaveText("Platform admin");
    const links = await navLinks(page);
    expect([links[0], links.at(-1)]).toEqual(["Schools", "Health"]);
    await expect(mainNav(page).getByRole("link", { name: "Schools" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await accountButton(page).click();
    await expect(page.getByText("All schools", { exact: true })).toBeVisible();
    const open = page.getByRole("group", { name: "Open a school" });
    await expect(open.getByRole("menuitem", { name: /^Herzliah High School/ })).toBeVisible();
    await expect(open.getByRole("menuitem", { name: /^Test School/ })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);

    await page.getByRole("menuitem", { name: /^Support access/ }).click();
    await expect(page).toHaveURL(root(baseURL!, "/console/support"));
    await expect(mainNav(page).getByRole("link", { name: /^Support/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("a platform admin with a support grant sees the platform bar at that school", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, root(baseURL!), accounts.system);
    await page.goto(root(baseURL!, "/console/support?school=test-school"));
    const reason = `Nav bar check ${Date.now().toString(36)}`;
    await page.getByLabel("Reason (required; the school sees this)").fill(reason);
    await page.getByRole("button", { name: "Open grant" }).click();
    const grant = page.locator(".panelWarn", { hasText: reason });
    await expect(grant).toContainText("Active: Test School");
    try {
      const testSchool = addressOf(baseURL!, "test-school");
      await signInAs(context, testSchool, accounts.system);
      await page.goto(addressOf(baseURL!, "test-school", "/account/platform"));
      await expect(pill(page)).toHaveText("Platform admin");
      await expect(mainNav(page).getByRole("link", { name: "Schools" })).toHaveAttribute(
        "href",
        root(baseURL!, "/console"),
      );
    } finally {
      await page.goto(root(baseURL!, "/console/support"));
      await grant.getByRole("button", { name: "End now" }).click();
      await expect(grant).toHaveCount(0);
    }
  });
});
