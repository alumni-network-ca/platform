import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { accounts, LOCAL_PASSWORD } from "./fixtures/accounts";

// Needs the local Supabase stack with the seed applied. The base URL is Herzliah's address
// (herzliah.localhost); the other addresses swap its first label.

function addressOf(baseURL: string, slug: string | null, path = "/") {
  const url = new URL(path, baseURL);
  const parent = url.hostname.split(".").slice(1).join(".");
  url.hostname = slug ? `${slug}.${parent}` : parent;
  return url.toString();
}

async function signIn(page: Page, url: string, email: string) {
  await page.goto(url);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(LOCAL_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/directory");
}

// The Supabase session cookie, base64url JSON, split into chunks of at most 3180 characters.
const CHUNK = 3180;

async function readSession(context: BrowserContext, url: string) {
  const cookies = (await context.cookies(url)).filter((c) =>
    /^sb-.+-auth-token(\.\d+)?$/.test(c.name),
  );
  const name = cookies[0]!.name.replace(/\.\d+$/, "");
  const value = cookies
    .sort((a, b) => Number(a.name.split(".").pop()) - Number(b.name.split(".").pop()))
    .map((c) => c.value)
    .join("");
  const session = JSON.parse(Buffer.from(value.replace(/^base64-/, ""), "base64url").toString());
  return { name, cookies, session: session as { expires_at: number; access_token: string } };
}

async function writeSession(context: BrowserContext, url: string, name: string, session: object) {
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const chunks =
    value.length <= CHUNK ? [value] : (value.match(new RegExp(`.{1,${CHUNK}}`, "g")) ?? []);
  const { hostname } = new URL(url);
  await context.addCookies(
    chunks.map((chunk, i) => ({
      name: chunks.length === 1 ? name : `${name}.${i}`,
      value: chunk,
      domain: hostname,
      path: "/",
      sameSite: "Lax" as const,
    })),
  );
}

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

  test("the directory lists only that school's alumni", async ({ page, baseURL }) => {
    await signIn(page, addressOf(baseURL!, "test-school", "/login"), accounts.testSchoolAlumni);
    await expect(page.getByRole("link", { name: /Other\s+School/ })).toBeVisible();
    await expect(page.getByText("Maya Frenkel")).toHaveCount(0);
  });
});

test.describe("sessions", () => {
  test("a session belongs to one school's address", async ({ page, baseURL }) => {
    const header = page.getByRole("banner");
    await signIn(page, addressOf(baseURL!, "herzliah", "/login"), accounts.alumni);
    await expect(header.getByRole("button", { name: "Sign out" })).toBeVisible();

    // Signed out at the other school: the header offers the sign-up link (the sign-in link is hidden on phones).
    await page.goto(addressOf(baseURL!, "test-school"));
    await expect(header.getByRole("link", { name: "Claim your profile" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("an expired access token is refreshed on the next request", async ({
    page,
    context,
    baseURL,
  }) => {
    const herzliah = addressOf(baseURL!, "herzliah");
    await signIn(page, addressOf(baseURL!, "herzliah", "/login"), accounts.alumni);

    // Mark the access token as expired, as if the tab had been left open for over an hour.
    const before = await readSession(context, herzliah);
    await context.clearCookies({ name: new RegExp(`^${before.name}(\\.\\d+)?$`) });
    await writeSession(context, herzliah, before.name, {
      ...before.session,
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });

    await page.goto(addressOf(baseURL!, "herzliah", "/directory"));
    await expect(page).toHaveURL(/\/directory$/);
    await expect(page.getByRole("link", { name: /Maya\s+Frenkel/ })).toBeVisible();

    // proxy.ts refreshed the session and sent the new cookies back.
    const after = await readSession(context, herzliah);
    expect(after.session.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(after.session.access_token).not.toBe(before.session.access_token);
  });
});
