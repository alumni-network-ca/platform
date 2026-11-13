import { expect, type Locator, type Page, test } from "@playwright/test";
import { schoolTheme } from "@/lib/theme";
import { blockingViolations } from "./fixtures/a11y";
import { accounts } from "./fixtures/accounts";
import { addressOf, signInAs } from "./fixtures/session";

// School colours (ADR 0019). Herzliah sets none and keeps the default theme. Test School's seeded green and amber
// are too light behind white text, so its pages use the darker shades lib/theme.ts derives and must still pass axe.

const testSchool = schoolTheme({ primary_color: "#2E8B57", accent_color: "#F4A300" }) as Record<
  string,
  string
>;
const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const background = (target: Locator) =>
  target.first().evaluate((el) => getComputedStyle(el).backgroundColor);
// The nav bar, and its "Join now" button drawn in the school's action colour.
const bar = (page: Page) => page.getByRole("banner");
const joinNow = (page: Page) => bar(page).getByRole("link", { name: "Join now", exact: true });
const rootStyle = (page: Page) => page.locator("html").getAttribute("style");

test.describe("school colours", () => {
  test("Herzliah and the root site keep the default theme", async ({ page, baseURL }) => {
    await page.goto(addressOf(baseURL!, "herzliah", "/login"));
    expect(await rootStyle(page)).toBeNull();
    expect(await background(bar(page))).toBe("rgb(11, 33, 89)");
    expect(await background(joinNow(page))).toBe("rgb(123, 30, 61)");

    await page.goto(addressOf(baseURL!, null, "/"));
    expect(await rootStyle(page)).toBeNull();
  });

  test("Test School's pages use its colours, darkened where white text needs it", async ({
    page,
    baseURL,
  }) => {
    expect(testSchool["--brand"]).not.toBe("#2E8B57");
    for (const path of ["/login", "/join"]) {
      await page.goto(addressOf(baseURL!, "test-school", path));
      expect(await background(bar(page))).toBe(rgb(testSchool["--brand"]!));
      expect(await background(joinNow(page))).toBe(rgb(testSchool["--accent"]!));
      expect(await blockingViolations(page), path).toEqual([]);
    }
  });

  for (const [email, paths] of [
    [accounts.testSchoolAlumni, ["/home", "/directory", "/me"]],
    [accounts.testSchoolAdmin, ["/admin", "/admin/approvals", "/admin/settings"]],
  ] as const) {
    test(`${email} sees Test School's colours with no accessibility violations`, async ({
      page,
      context,
      baseURL,
    }) => {
      await signInAs(context, addressOf(baseURL!, "test-school"), email);
      for (const path of paths) {
        await page.goto(addressOf(baseURL!, "test-school", path));
        expect(await background(bar(page))).toBe(rgb(testSchool["--brand"]!));
        expect(await blockingViolations(page), path).toEqual([]);
      }
    });
  }
});
