import { expect, test, type Browser, type Page } from "@playwright/test";
import { blockingViolations } from "./fixtures/a11y";
import { accounts, LOCAL_PASSWORD } from "./fixtures/accounts";
import { authLinkFor, newAddress } from "./fixtures/mailpit";
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

/** A new invitee opens the link, creates a staff account with the invited address, confirms it and accepts. */
async function acceptAsNewStaff(
  browser: Browser,
  baseURL: string,
  slug: string,
  link: string,
  email: string,
  firstName: string,
) {
  const theirs = await browser.newContext();
  const invited = await theirs.newPage();
  await invited.goto(link);
  await expect(invited.getByRole("heading", { level: 1 })).toContainText(
    "Alumni Network invited you to join the",
  );
  await invited.getByRole("link", { name: "Create my staff account", exact: true }).click();
  await expect(invited.getByLabel("Email address")).toHaveValue(email);
  await invited.getByLabel("First name").fill(firstName);
  await invited.getByLabel("Last name").fill("Staff");
  await invited.getByLabel("Create a password", { exact: true }).fill(LOCAL_PASSWORD);
  await invited.getByLabel("Confirm password", { exact: true }).fill(LOCAL_PASSWORD);
  await invited.getByRole("button", { name: "Create my account", exact: true }).click();
  await expect(
    invited.getByRole("heading", { name: "Check your inbox", exact: true }),
  ).toBeVisible();
  await invited.goto(await authLinkFor(email, "signup"));
  await expect(invited).toHaveURL(link);
  await expect(invited.getByText("Matches the invitation", { exact: true })).toBeVisible();
  expect(await blockingViolations(invited)).toEqual([]);
  await invited.getByRole("button", { name: "Accept and continue" }).click();
  await expect(invited).toHaveURL(addressOf(baseURL, slug, "/admin?welcome=1"));
  await expect(
    invited.getByRole("heading", { name: `Welcome to the team, ${firstName}`, exact: true }),
  ).toBeVisible();
  return { context: theirs, page: invited };
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
    await expect(page.getByLabel("Role")).toHaveValue("school_admin");
    await page.getByRole("button", { name: "Send invitation" }).click();
    const link = await page.getByLabel("Invitation link").inputValue();
    expect(link.startsWith(addressOf(baseURL!, slug, "/staff/accept?token="))).toBe(true);

    // A new invitee sees the invitation first, creates a password account with the invited address,
    // confirms their email, then resumes the invitation (docs/design/staff-invite.md §3).
    const theirs = await acceptAsNewStaff(browser, baseURL!, slug, link, head, "Hannah");
    await theirs.context.close();

    await page.reload();
    const invitations = page.getByRole("table", { name: "Invitations" });
    await expect(invitations.getByRole("row", { name: new RegExp(head) })).toContainText(
      "Accepted",
    );
    const team = page.getByRole("table", { name: "Current staff" });
    await expect(team.getByRole("row", { name: new RegExp(head) })).toContainText("School admin");
  });

  test("a platform admin invites a reviewer, who can't manage staff", async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    await signInAs(context, root(baseURL!), accounts.system);
    const slug = await createSchool(page, baseURL!, "Birchwood College");

    const reviewer = newAddress("reviewer");
    await page.getByLabel("Email", { exact: true }).fill(reviewer);
    await page.getByLabel("Role").selectOption("reviewer");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByRole("status")).toContainText(
      `Send this link to ${reviewer} (reviewer)`,
    );
    const link = await page.getByLabel("Invitation link").inputValue();

    const theirs = await acceptAsNewStaff(browser, baseURL!, slug, link, reviewer, "Rita");
    const staffPage = await theirs.page.goto(addressOf(baseURL!, slug, "/admin/staff"));
    expect(staffPage?.status()).toBe(403);
    await theirs.context.close();

    await page.reload();
    const team = page.getByRole("table", { name: "Current staff" });
    await expect(team.getByRole("row", { name: /Rita Staff/ })).toContainText("Reviewer");
    expect(await blockingViolations(page)).toEqual([]);
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
    const grant = page.locator("[data-grant]", { hasText: reason });
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
