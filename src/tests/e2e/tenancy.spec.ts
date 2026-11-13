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
    const header = page.getByRole("banner");
    await expect(header).toHaveCount(1);
    await expect(header.getByRole("link", { name: "Alumni Network For schools" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Keep your alumni connected.");
    await page.getByRole("link", { name: "Request a quote" }).click();
    await expect(page).toHaveURL(/\?inquiry=quote#contact$/);
    await expect(page.getByRole("combobox")).toHaveValue("quote");
    await page.getByRole("link", { name: "Book a demo" }).click();
    await expect(page).toHaveURL(/\?inquiry=demo#contact$/);
    await expect(page.getByRole("combobox")).toHaveValue("demo");
    await expect(page.getByRole("link", { name: /^(sign in|join|sign up)$/i })).toHaveCount(0);
    const response = await page.goto(addressOf(baseURL!, "herzliah", "/site"));
    expect(response?.status()).toBe(404);
  });

  test("each site's pages stay on its own address", async ({ page, baseURL }) => {
    for (const [slug, path] of [
      ["herzliah", "/site"],
      ["herzliah", "/console"],
      ["admin", "/site"],
      [null, "/site"],
    ] as const) {
      const response = await page.request.get(addressOf(baseURL!, slug, path), {
        maxRedirects: 0,
      });
      expect(response.status(), `${slug ?? "root"}${path}`).toBe(404);
    }
  });

  test("the console's old root-domain links move to admin.", async ({ page, baseURL }) => {
    for (const [from, to] of [
      ["/console", "/"],
      ["/console/schools/new?x=1", "/schools/new?x=1"],
      ["/login?next=%2Fsupport", "/login?next=%2Fsupport"],
    ]) {
      const response = await page.request.get(addressOf(baseURL!, null, from), {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(308);
      expect(response.headers().location).toBe(addressOf(baseURL!, "admin", to));
    }
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
    const account = header.getByRole("button", { name: /^Account menu for/ });
    await expect(account).toBeVisible();

    // Signed out at the other school: the header offers sign-in instead of the account menu.
    await page.goto(addressOf(baseURL!, "test-school"));
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(account).toHaveCount(0);
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

    await page.goto(addressOf(baseURL!, "herzliah", "/directory?q=frenkel"));
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/directory?q=frenkel"));
    await expect(page.getByRole("link", { name: /Maya\s+Frenkel/ })).toBeVisible();

    // proxy.ts refreshed the session and sent the new cookies back.
    const after = await readSession(context, herzliah);
    expect(after.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(after.access_token).not.toBe(before.access_token);
  });
});
