import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "../scripts/lib/supabase-admin";
import { blockingViolations } from "./fixtures/a11y";
import { accounts, LOCAL_PASSWORD } from "./fixtures/accounts";
import { authLinkFor, clearInbox, codeFor, newAddress } from "./fixtures/mailpit";
import { addressOf, readSession, signInAs, stack } from "./fixtures/session";

async function signIn(page: Page, email: string, password = LOCAL_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function signUp(page: Page, email: string) {
  await page.goto("/join");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Create a password", { exact: true }).fill(LOCAL_PASSWORD);
  await page.getByLabel("Confirm password", { exact: true }).fill(LOCAL_PASSWORD);
  await page.getByRole("button", { name: "Create my account", exact: true }).click();
  await expect(page).toHaveURL(/\/join\/verify$/);
  await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();
}
const badPassword = (page: Page) =>
  expect(page.locator(".notice[role=alert]")).toHaveText("Wrong email or password.");

test("the public email Join link and navbar open the same account creation page", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await header.getByRole("link", { name: "Join now", exact: true }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(
    page.getByRole("heading", { name: "Create your account", exact: true, level: 2 }),
  ).toBeVisible();
  await expect(page.getByText("Creating an account does not grant alumni access.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send me a code" })).toHaveCount(0);
  expect(await blockingViolations(page)).toEqual([]);
  // This is the ordinary link placed in the school's email; no invitation token or alternate signup.
  await page.goto("/join");
  await expect(page.getByRole("button", { name: "Create my account" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.E2E_SCREENSHOT_DIR)
    await page.screenshot({
      path: join(process.env.E2E_SCREENSHOT_DIR, `signup-${testInfo.project.name}-en.png`),
      fullPage: true,
    });
  await page.getByRole("banner").getByRole("button", { name: "FR · Français" }).click();
  await expect(page.getByRole("button", { name: "Créer mon compte", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Créez votre compte", level: 2 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.E2E_SCREENSHOT_DIR)
    await page.screenshot({
      path: join(process.env.E2E_SCREENSHOT_DIR, `signup-${testInfo.project.name}-fr.png`),
      fullPage: true,
    });
});

test("signup confirms email on another device, waits for a reviewer and unlocks onboarding only after approval", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const email = newAddress("signup-review");
  await signUp(page, email);
  await expect(page.getByRole("button", { name: /Resend available/ })).toBeDisabled();
  await page.context().clearCookies();
  await signIn(page, email);
  await badPassword(page); // Email ownership has not been confirmed.
  const secondDevice = await browser.newContext({ baseURL });
  const applicant = await secondDevice.newPage();
  const reviewerContext = await browser.newContext({ baseURL });
  const reviewer = await reviewerContext.newPage();
  try {
    await applicant.goto(await authLinkFor(email, "signup"));
    await expect(applicant).toHaveURL(addressOf(baseURL!, "herzliah", "/join"));
    await expect(
      applicant.getByRole("heading", { name: "Request alumni access", exact: true }),
    ).toBeVisible();
    const session = await readSession(secondDevice, baseURL!);
    const client = createClient(stack.url, stack.publishableKey, {
      global: { headers: { Authorization: "Bearer " + session.access_token } },
      auth: { persistSession: false },
    });
    const membership = await client.from("institution_memberships").select("role, status");
    expect(membership.data).toEqual([]);
    await applicant.getByLabel("First name").fill("Jo");
    await applicant.getByLabel("Last name", { exact: true }).fill("Iner");
    await applicant.getByLabel("Graduation year").fill("2010");
    await applicant.getByRole("button", { name: "Submit for school review" }).click();
    await expect(applicant).toHaveURL(/\/account\/pending$/);
    await expect(applicant.getByText("Awaiting school approval", { exact: true })).toBeVisible();
    for (const route of ["/directory", "/admin"]) {
      await applicant.goto(route);
      await expect(applicant).toHaveURL(/\/account\/pending$/);
    }
    await applicant.getByRole("link", { name: "Edit my request", exact: true }).click();
    await applicant.getByLabel("Graduation year").fill("2011");
    await applicant.getByRole("button", { name: "Save request details" }).click();
    await expect(applicant).toHaveURL(/\/account\/pending$/);
    const owner = adminClient(stack);
    const { data: requests, error } = await owner
      .from("access_requests")
      .select("id, grad_year")
      .eq("email", email);
    expect(error).toBeNull();
    expect(requests).toHaveLength(1);
    expect(requests![0]!.grad_year).toBe(2011);
    await signInAs(reviewerContext, baseURL!, accounts.reviewer);
    await reviewer.goto("/admin/approvals/" + requests![0]!.id);
    await reviewer.getByRole("radio", { name: "Ask for more info", exact: true }).check();
    await reviewer.getByLabel("Question for the applicant").fill("Which homeroom were you in?");
    await reviewer.getByRole("button", { name: "Ask for more info", exact: true }).click();
    await expect(reviewer).toHaveURL(/\/admin\/approvals\?tab=needs_info$/);
    await applicant.goto("/auth/home");
    await expect(applicant).toHaveURL(/\/account\/needs-info$/);
    await applicant.getByLabel("Your answer", { exact: true }).fill("Homeroom with Mme Tremblay.");
    await applicant.getByRole("button", { name: "Send reply to the reviewer" }).click();
    await expect(applicant).toHaveURL(/\/account\/pending$/);
    await reviewer.goto("/admin/approvals/" + requests![0]!.id);
    await reviewer.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(reviewer).toHaveURL(/\/admin\/approvals\?tab=decided$/);
    await applicant.getByRole("link", { name: "Check request status", exact: true }).click();
    await expect(applicant).toHaveURL(/\/onboarding\/welcome$/);
    await expect(applicant.getByText("Approved by Herzliah", { exact: true })).toBeVisible();
    // The approved profile starts hidden.
    const { data: profile } = await client
      .from("alumni_profiles")
      .select("visibility")
      .eq("user_id", sessionUser(session.access_token));
    expect(profile?.[0]?.visibility).toBe("hidden");
  } finally {
    await secondDevice.close();
    await reviewerContext.close();
  }
});
function sessionUser(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString()).sub as string;
}

test("signup rejects mismatched passwords before creating an account", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Email address").fill(newAddress("mismatch"));
  await page.getByLabel("Create a password", { exact: true }).fill(LOCAL_PASSWORD);
  await page.getByLabel("Confirm password", { exact: true }).fill(LOCAL_PASSWORD + "x");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.locator(".notice[role=alert]")).toHaveText("The two passwords are different.");
  await expect(page).toHaveURL(/\/join$/);
});

test("password sign-in returns members to the page they requested and exposes no code controls", async ({
  page,
  baseURL,
}) => {
  await page.goto("/directory");
  await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/login?next=%2Fdirectory"));
  await expect(page.getByRole("button", { name: /code/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Create an account", exact: true })).toHaveAttribute(
    "href",
    "/join",
  );
  expect(await blockingViolations(page)).toEqual([]);
  await page.getByLabel("Email address").fill(accounts.alumni);
  await page.getByLabel("Password", { exact: true }).fill(LOCAL_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/directory"));
});

test("unknown email, wrong password and an account without a password have the same answer", async ({
  page,
}) => {
  await signIn(page, accounts.alumni, "wrong-password");
  await badPassword(page);
  await signIn(page, newAddress("unknown"));
  await badPassword(page);
  const email = newAddress("no-password");
  const { error } = await adminClient(stack).auth.admin.createUser({ email, email_confirm: true });
  expect(error).toBeNull();
  await signIn(page, email);
  await badPassword(page);
});

test("a user who previously had no password can recover access by email link", async ({
  page,
  browser,
  baseURL,
}) => {
  const email = newAddress("password-recovery");
  const owner = adminClient(stack);
  expect((await owner.auth.admin.createUser({ email, email_confirm: true })).error).toBeNull();
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send password reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  const otherDevice = await browser.newContext({ baseURL });
  const reset = await otherDevice.newPage();
  try {
    const link = await authLinkFor(email, "recovery");
    await reset.goto(link);
    await expect(reset).toHaveURL(/\/reset-password$/);
    await reset.getByLabel("New password", { exact: true }).fill(LOCAL_PASSWORD);
    await reset.getByLabel("Type it again").fill(LOCAL_PASSWORD);
    await reset.getByRole("button", { name: "Save my password" }).click();
    await expect(reset.getByRole("status")).toContainText("Your password is saved.");
    await otherDevice.clearCookies();
    await signIn(reset, email);
    await expect(reset).toHaveURL(/\/join$/);
  } finally {
    await otherDevice.close();
  }
});

test("malformed, expired or external-target confirmation links never grant access", async ({
  page,
}) => {
  await page.goto("/auth/confirm?type=signup&token_hash=invalid&next=https%3A%2F%2Fevil.example");
  await expect(page).toHaveURL(/\/join\?confirmation=expired$/);
  await expect(page.getByText(/This confirmation link is invalid or expired/)).toBeVisible();
  await page.goto("/auth/confirm?type=email_change&token_hash=invalid");
  await expect(page).toHaveURL(/\/join\?confirmation=expired$/);
});

test("changing email still requires confirmation of both addresses", async ({ page }) => {
  const before = newAddress("email-before");
  const after = newAddress("email-after");
  expect(
    (
      await adminClient(stack).auth.admin.createUser({
        email: before,
        password: LOCAL_PASSWORD,
        email_confirm: true,
      })
    ).error,
  ).toBeNull();
  await signIn(page, before);
  await expect(page).toHaveURL(/\/join$/);
  await page.goto("/account/email");
  await clearInbox(before);
  await page.getByLabel("New email address").fill(after);
  await page.getByRole("button", { name: "Send the codes" }).click();
  await page.getByLabel("Code sent to " + after).fill(await codeFor(after));
  await page.getByLabel("Code sent to " + before).fill(await codeFor(before));
  await page.getByRole("button", { name: "Change my email" }).click();
  await expect(page.getByRole("status")).toHaveText("Done. You now sign in with " + after + ".");
});

test("password settings still require a signed-in account", async ({ page, baseURL }) => {
  await page.goto("/account/password");
  await expect(page).toHaveURL(
    addressOf(baseURL!, "herzliah", "/login?next=%2Faccount%2Fpassword"),
  );
});
