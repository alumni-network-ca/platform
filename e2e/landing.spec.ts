import { expect, test } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { addressOf, signInAs } from "./fixtures/session";

// Where each person lands after sign-in, and the page guards (ADR 0014). Seed accounts sign in through the API;
// the sign-in form itself is covered in auth.spec.ts.

const homes: [school: string, email: string, home: string][] = [
  ["herzliah", accounts.admin, "/admin"],
  ["herzliah", accounts.reviewer, "/admin"],
  ["herzliah", accounts.alumni, "/directory"],
  ["herzliah", accounts.newMember, "/onboarding"],
  ["herzliah", accounts.pending, "/account/pending"],
  ["herzliah", accounts.needsInfo, "/account/needs-info"],
  ["herzliah", accounts.rejected, "/account/rejected"],
  ["herzliah", accounts.withdrawn, "/join"],
  ["herzliah", accounts.suspended, "/account/suspended"],
  ["herzliah", accounts.outsider, "/join"],
  // On a school's address a system admin is treated like anyone else.
  ["herzliah", accounts.system, "/join"],
  ["test-school", accounts.testSchoolAdmin, "/admin"],
  ["test-school", accounts.testSchoolAlumni, "/directory"],
  ["test-school", accounts.testSchoolPending, "/account/pending"],
  // A person's state at one school says nothing about another (DEC-13).
  ["test-school", accounts.alumni, "/join"],
];

test.describe("landing on the right home page", () => {
  for (const [school, email, home] of homes) {
    test(`${email} at ${school} lands on ${home}`, async ({ page, context, baseURL }) => {
      await signInAs(context, addressOf(baseURL!, school), email);
      await page.goto(addressOf(baseURL!, school, "/auth/home"));
      await expect(page).toHaveURL(addressOf(baseURL!, school, home));
    });
  }

  test("a signed-in visitor of the home page goes to their own", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/");
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/directory"));
  });

  test("the account pages show the school's question and decision", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.needsInfo);
    await page.goto("/account/needs-info");
    await expect(page.getByText("Which homeroom were you in during your last year?")).toBeVisible();

    await signInAs(context, baseURL!, accounts.rejected);
    await page.goto("/account/rejected");
    await expect(
      page.getByText("Summer camp attendance does not make you a graduate."),
    ).toBeVisible();
  });
});

test.describe("?next=", () => {
  test("is honored when it is a page the person may open", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/auth/home?next=%2Fprofile%2F00000000-0000-4000-8000-000000000002");
    await expect(page).toHaveURL(
      addressOf(baseURL!, "herzliah", "/profile/00000000-0000-4000-8000-000000000002"),
    );
  });

  for (const next of ["https://evil.example/x", "//evil.example/x", "/\\evil.example"]) {
    test(`never leaves the site: ${next}`, async ({ page, context, baseURL }) => {
      await signInAs(context, baseURL!, accounts.alumni);
      await page.goto(`/auth/home?next=${encodeURIComponent(next)}`);
      await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/directory"));
    });
  }

  test("falls back to home when the person may not open it", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.pending);
    await page.goto("/auth/home?next=%2Fdirectory");
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/account/pending"));
  });
});

test.describe("page guards", () => {
  test("send a signed-out visitor to sign in, then back", async ({ page, baseURL }) => {
    await page.goto("/directory");
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/login?next=%2Fdirectory"));
  });

  test("send a pending applicant away from the directory", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.pending);
    await page.goto("/directory");
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/account/pending"));
  });

  test("keep alumni out of admin and sign-up", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/admin");
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/directory"));
    await page.goto("/join");
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/directory"));
  });
});

test("signing out ends this school's session only", async ({ page, context, baseURL }) => {
  const herzliah = addressOf(baseURL!, "herzliah");
  const testSchool = addressOf(baseURL!, "test-school");
  await signInAs(context, herzliah, accounts.alumni);
  await signInAs(context, testSchool, accounts.alumni);

  const header = page.getByRole("banner");
  await page.goto(addressOf(baseURL!, "herzliah", "/directory"));
  await header.getByRole("button", { name: "Sign out" }).click();
  await expect(header.getByRole("link", { name: "Join" })).toBeVisible();

  await page.goto(addressOf(baseURL!, "test-school", "/join"));
  await expect(header.getByRole("button", { name: "Sign out" })).toBeVisible();
});
