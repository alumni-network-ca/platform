import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { addressOf, readSession, signInAs, writeSession } from "./fixtures/session";

// Needs the local Supabase stack with the seed applied. The base URL is Herzliah's address
// (herzliah.localhost); the other addresses swap its first label.

test.describe("each school at its own address", () => {
  test("shows the school's own name", async ({ page, baseURL }) => {
    await page.goto(addressOf(baseURL!, "herzliah"));
    await expect(page.getByRole("link", { name: /^Herzliah Alumni Network/ })).toBeVisible();
    await expect(page).toHaveTitle("Herzliah Alumni Network");

    await page.goto(addressOf(baseURL!, "test-school"));
    await expect(page.getByRole("link", { name: /^Test School Alumni Network/ })).toBeVisible();
    await expect(page).toHaveTitle("Test School Alumni Network");
  });

  test("an unknown school is not found", async ({ page, baseURL }) => {
    const response = await page.goto(addressOf(baseURL!, "no-such-school"));
    expect(response?.status()).toBe(404);
  });

  test("the root domain shows the page for schools", async ({ page, baseURL }) => {
    await page.goto(addressOf(baseURL!, null));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/networks for school alumni/i);
    const response = await page.goto(addressOf(baseURL!, "herzliah", "/site"));
    expect(response?.status()).toBe(404);
  });

  test("the directory lists only that school's alumni", async ({ page, context, baseURL }) => {
    await signInAs(context, addressOf(baseURL!, "test-school"), accounts.testSchoolAlumni);
    await page.goto(addressOf(baseURL!, "test-school", "/directory"));
    await expect(page.getByRole("link", { name: /Other\s+School/ })).toBeVisible();
    await expect(page.getByText("Maya Frenkel")).toHaveCount(0);
  });
});

test.describe("sessions", () => {
  test("a session belongs to one school's address", async ({ page, context, baseURL }) => {
    const header = page.getByRole("banner");
    await signInAs(context, addressOf(baseURL!, "herzliah"), accounts.alumni);
    await page.goto(addressOf(baseURL!, "herzliah", "/directory"));
    await expect(header.getByRole("button", { name: "Sign out" })).toBeVisible();

    // Signed out at the other school: the header offers the sign-up link (the sign-in link is hidden on phones).
    await page.goto(addressOf(baseURL!, "test-school"));
    await expect(header.getByRole("link", { name: "Join" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("an expired access token is refreshed on the next request", async ({
    page,
    context,
    baseURL,
  }) => {
    const herzliah = addressOf(baseURL!, "herzliah");
    await signInAs(context, herzliah, accounts.alumni);

    // Mark the access token as expired, as if the tab had been left open for over an hour.
    const before = await readSession(context, herzliah);
    await writeSession(context, herzliah, {
      ...before,
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });

    await page.goto(addressOf(baseURL!, "herzliah", "/directory"));
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/directory"));
    await expect(page.getByRole("link", { name: /Maya\s+Frenkel/ })).toBeVisible();

    // proxy.ts refreshed the session and sent the new cookies back.
    const after = await readSession(context, herzliah);
    expect(after.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(after.access_token).not.toBe(before.access_token);
  });
});
