import { expect, test, type Page } from "@playwright/test";
import { blockingViolations } from "./fixtures/a11y";
import { accounts, LOCAL_PASSWORD } from "./fixtures/accounts";
import { codeFor, newAddress } from "./fixtures/mailpit";
import { addressOf, signInAs } from "./fixtures/session";

// The platform console on the root domain (SA-01, SA-02; design S1–S2). Schools created here get a unique
// address per run, so the tests can run in parallel and again on the same database.

const root = (baseURL: string, path = "/") => addressOf(baseURL, null, path);
const uniqueSlug = () => `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function createSchool(page: Page, baseURL: string, name: string) {
  const slug = uniqueSlug();
  await page.goto(root(baseURL, "/console/schools/new"));
  await page.getByLabel("School name").fill(name);
  await page.getByLabel("Web address").fill(slug);
  await page.getByLabel("Replies go to").fill("office@school.test");
  await page.getByRole("button", { name: "Create school" }).click();
  await expect(page).toHaveURL(root(baseURL, `/console/schools/${slug}`));
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return slug;
}

test.describe("platform console", () => {
  test("a signed-out visitor signs in on the root domain first", async ({ page, baseURL }) => {
    await page.goto(root(baseURL!, "/console"));
    await expect(page).toHaveURL(root(baseURL!, "/login?next=%2Fconsole"));
    await expect(page.getByRole("heading", { name: "Sign in to Alumni Network" })).toBeVisible();
  });

  test("a platform admin signs in with a password and sees every school", async ({
    page,
    baseURL,
  }) => {
    await page.goto(root(baseURL!, "/login?next=%2Fconsole"));
    await page.getByRole("button", { name: "Sign in with a password" }).click();
    await page.getByLabel("Email address").fill(accounts.system);
    await page.getByLabel("Password", { exact: true }).fill(LOCAL_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(root(baseURL!, "/console"));
    await expect(page.getByRole("link", { name: "Herzliah High School" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Test School", exact: true })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });

  test("any other account is refused", async ({ page, context, baseURL }) => {
    await signInAs(context, root(baseURL!), accounts.admin);
    await page.goto(root(baseURL!, "/console"));
    await expect(page).toHaveURL(root(baseURL!, "/console/no-access"));
    await expect(page.getByRole("heading", { name: "No access to the console" })).toBeVisible();
  });

  test("a new school's first admin accepts the invitation link", async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    await signInAs(context, root(baseURL!), accounts.system);
    const slug = await createSchool(page, baseURL!, "Maple Ridge Academy");
    expect(await blockingViolations(page)).toEqual([]);

    const head = newAddress("head");
    await page.getByLabel("Email", { exact: true }).fill(head);
    await page.getByRole("button", { name: "Invite school admin" }).click();
    const link = await page.getByLabel("Invitation link").inputValue();
    expect(link.startsWith(addressOf(baseURL!, slug, "/staff/accept?token="))).toBe(true);

    // The invited person opens the link in their own browser, signs in with a code, and accepts.
    const theirs = await browser.newContext();
    const invited = await theirs.newPage();
    await invited.goto(link);
    await expect(invited).toHaveURL(/\/login\?next=/);
    await invited.getByLabel("Email address").fill(head);
    await invited.getByRole("button", { name: "Send me a code" }).click();
    await invited.getByLabel("6-digit code").fill(await codeFor(head));
    await invited.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(invited).toHaveURL(link);
    await invited.getByRole("button", { name: "Accept the invitation" }).click();
    await expect(invited).toHaveURL(addressOf(baseURL!, slug, "/admin"));
    await theirs.close();

    await page.reload();
    await expect(page.getByRole("row", { name: new RegExp(head) })).toContainText("Accepted");
  });

  test("a platform admin suspends and reactivates a school", async ({ page, context, baseURL }) => {
    await signInAs(context, root(baseURL!), accounts.system);
    const slug = await createSchool(page, baseURL!, "Short-Lived School");
    await page.getByRole("link", { name: "Suspend the school…" }).click();
    const suspend = page.getByRole("button", { name: "Suspend school" });
    await page.getByLabel("Reason").fill("Contract paused");
    await expect(suspend).toBeDisabled();
    await page.getByLabel(`Type ${slug} to confirm`).fill(slug);
    await suspend.click();
    await expect(page).toHaveURL(root(baseURL!, `/console/schools/${slug}`));
    await expect(page.getByText("Suspended", { exact: true })).toBeVisible();
    expect((await page.request.get(addressOf(baseURL!, slug, "/"))).status()).toBe(404);

    await page.getByRole("link", { name: "Reactivate the school…" }).click();
    await page.getByLabel(`Type ${slug} to confirm`).fill(slug);
    await page.getByRole("button", { name: "Reactivate school" }).click();
    await expect(page.getByText("Live", { exact: true })).toBeVisible();
  });

  test("a platform admin opens and ends support access", async ({ page, context, baseURL }) => {
    await signInAs(context, root(baseURL!), accounts.system);
    const reason = `Support ticket ${uniqueSlug()}`;
    await page.goto(root(baseURL!, "/console/support?school=test-school"));
    // Test School is preselected from ?school=.
    await expect(page.getByRole("combobox", { name: /^School/ })).toHaveValue(
      "aaaaaaaa-0000-4000-8000-000000000002",
    );
    await page.getByLabel("Reason (required; the school sees this)").fill(reason);
    await page.getByRole("button", { name: "Open grant" }).click();
    const grant = page.locator(".panelWarn", { hasText: reason });
    await expect(grant).toContainText("Active: Test School");
    await grant.getByRole("button", { name: "End now" }).click();
    await expect(grant).toHaveCount(0);
    await expect(page.getByRole("row", { name: new RegExp(reason) })).toContainText("ended early");
  });
});

test("a platform admin on a school's address is pointed to the console", async ({
  page,
  context,
  baseURL,
}) => {
  await signInAs(context, baseURL!, accounts.system);
  await page.goto("/auth/home");
  await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/account/platform"));
  await expect(page.getByRole("link", { name: "Open the console" })).toHaveAttribute(
    "href",
    root(baseURL!, "/console/support?school=herzliah"),
  );
});
