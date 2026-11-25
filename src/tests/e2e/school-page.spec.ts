import { expect, test } from "@playwright/test";
import { adminClient } from "@scripts/lib/supabase-admin";
import { blockingViolations } from "./fixtures/a11y";
import { accounts } from "./fixtures/accounts";
import { signInAs, stack } from "./fixtures/session";

// The school page (SCH-01..03; design SchoolPage): school admins fill it in, alumni of that school read it, and the
// nav shows the School link only while the page has something in it. supabase/tests/database/15_school_page.test.sql
// covers the roles and the link rules in SQL.
const herzliah = "aaaaaaaa-0000-4000-8000-000000000001";

test.describe("school page", () => {
  test.describe.configure({ mode: "serial" });
  test.afterAll(async () => {
    await adminClient(stack).from("school_pages").delete().eq("institution_id", herzliah);
  });

  test("with nothing filled in there is no page and no nav link", async ({
    page,
    context,
    baseURL,
  }) => {
    await adminClient(stack).from("school_pages").delete().eq("institution_id", herzliah);
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/home");
    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "School" }),
    ).toHaveCount(0);
    const response = await page.goto("/school");
    expect(response?.status()).toBe(404);
  });

  test("a school admin refuses a link that is not https", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.admin);
    await page.goto("/admin/school-page");
    await page.getByLabel("Donate link").fill("http://give.example.org");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    const rows = await adminClient(stack).from("school_pages").select("institution_id");
    expect(rows.data).toEqual([]);
  });

  test("a school admin saves the page and sees it previewed", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.admin);
    await page.goto("/admin/school-page");
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByLabel("School website").fill("https://www.herzliah.example");
    await page.getByLabel("Donate link").fill("https://give.herzliah.example/fund");
    await page.getByLabel("Instagram").fill("https://instagram.com/herzliah");
    await page.getByLabel("About (English)").fill("A school in Montreal.");
    await page.getByLabel("Name", { exact: true }).fill("Alumni Relations");
    await page.getByLabel("Email", { exact: true }).fill("alumni@herzliah.example");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Changes saved");
    const preview = page.getByRole("region", { name: "How alumni see it" });
    await expect(
      preview.getByRole("link", { name: /Donate on give\.herzliah\.example/ }),
    ).toBeVisible();
    await expect(preview.getByText("Alumni Relations")).toBeVisible();
  });

  test("an alumnus sees the page, with the leave-site note and safe links", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    await page.goto("/home");
    const link = page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "School" });
    await link.click();
    await expect(page).toHaveURL(/\/school$/);
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Herzliah High School");
    await expect(page.getByText("A school in Montreal.")).toBeVisible();
    await expect(page.getByText(/You will leave .* Donations are handled by/)).toBeVisible();
    const donate = page.getByRole("link", { name: /Donate on give\.herzliah\.example/ });
    await expect(donate).toHaveAttribute("target", "_blank");
    await expect(donate).toHaveAttribute("rel", "noopener noreferrer");
    // Fields the school left empty do not appear.
    await expect(page.getByRole("heading", { name: "Find us" })).toHaveCount(0);
    expect(await blockingViolations(page)).toEqual([]);
  });

  test("a reviewer cannot open the admin page", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.reviewer);
    const response = await page.goto("/admin/school-page");
    expect(response?.status()).toBe(403);
  });
});
