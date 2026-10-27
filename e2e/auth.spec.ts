import { expect, test, type Page } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { clearInbox, codeFor, newAddress } from "./fixtures/mailpit";
import { addressOf } from "./fixtures/session";

// Sign-in with an emailed code (DEC-15, ADR 0014), through the real form and real emails in Mailpit.

async function requestCode(page: Page, email: string) {
  await clearInbox(email);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByRole("status")).toHaveText(
    `We sent a 6-digit code to ${email}. It expires in 10 minutes.`,
  );
}

async function enterCode(page: Page, code: string) {
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test.describe("sign-in with an emailed code", () => {
  test("a member is sent back to the page they wanted", async ({ page, baseURL }, testInfo) => {
    // One shared seed account: run it in one browser project only, so two codes never race.
    test.skip(testInfo.project.name !== "desktop", "uses a shared seed account");
    await page.goto(addressOf(baseURL!, "test-school", "/directory"));
    await expect(page).toHaveURL(addressOf(baseURL!, "test-school", "/login?next=%2Fdirectory"));
    await requestCode(page, accounts.testSchoolAlumni);
    await enterCode(page, await codeFor(accounts.testSchoolAlumni));
    await expect(page).toHaveURL(addressOf(baseURL!, "test-school", "/directory"));
    await expect(page.getByRole("link", { name: /Other\s+School/ })).toBeVisible();
  });

  test("a new email signs up with the same form and waits for approval", async ({
    page,
    baseURL,
  }) => {
    const email = newAddress("joiner");
    await page.goto("/login");
    await requestCode(page, email);
    await enterCode(page, await codeFor(email));
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/join"));

    await page.getByLabel("First name").fill("Jo");
    await page.getByLabel("Last name", { exact: true }).fill("Iner");
    await page.getByLabel("Graduation year").fill("2010");
    await page.getByRole("button", { name: "Send my request" }).click();
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/account/pending"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your request is with Herzliah",
    );
  });

  test("the answer is the same whether or not an email is known", async ({ page }) => {
    const unknown = newAddress("unknown");
    await page.goto("/login");
    await requestCode(page, unknown);
    const answer = (await page.getByRole("status").textContent())!.replace(unknown, "EMAIL");

    await page.getByRole("button", { name: "Use a different email" }).click();
    await requestCode(page, accounts.outsider);
    expect(
      (await page.getByRole("status").textContent())!.replace(accounts.outsider, "EMAIL"),
    ).toBe(answer);
  });

  test("a code requested on one device works on another", async ({ page, browser, baseURL }) => {
    const email = newAddress("two-devices");
    await page.goto("/login");
    await requestCode(page, email);
    const code = await codeFor(email);

    const phone = await browser.newContext({ baseURL });
    const phonePage = await phone.newPage();
    await phonePage.goto("/login");
    await phonePage.getByRole("button", { name: "I already have a code" }).click();
    await phonePage.getByLabel("Email address").fill(email);
    await enterCode(phonePage, code);
    await expect(phonePage).toHaveURL(addressOf(baseURL!, "herzliah", "/join"));
    await phone.close();
  });

  test("a wrong code is refused", async ({ page, baseURL }) => {
    const email = newAddress("wrong-code");
    await page.goto("/login");
    await requestCode(page, email);
    await enterCode(page, "000000");
    // Next.js also renders an empty role="alert" route announcer, hence the class.
    await expect(page.locator(".notice[role=alert]")).toHaveText(
      "That code is wrong or has expired.",
    );
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/login"));
  });

  test("changing email needs a code from both addresses", async ({ page, baseURL }) => {
    const before = newAddress("before");
    const after = newAddress("after");
    await page.goto("/login");
    await requestCode(page, before);
    await enterCode(page, await codeFor(before));
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/join"));

    await page.goto("/account/email");
    await clearInbox(before);
    await page.getByLabel("New email address").fill(after);
    await page.getByRole("button", { name: "Send the codes" }).click();
    await page.getByLabel(`Code sent to ${after}`).fill(await codeFor(after));
    await page.getByLabel(`Code sent to ${before}`).fill(await codeFor(before));
    await page.getByRole("button", { name: "Change my email" }).click();
    await expect(page.getByRole("status")).toHaveText(`Done. You now sign in with ${after}.`);
  });
});
