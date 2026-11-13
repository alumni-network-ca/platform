import { expect, test } from "@playwright/test";
import { adminClient } from "../../../scripts/lib/supabase-admin.ts";
import { blockingViolations } from "./fixtures/a11y";
import { accounts } from "./fixtures/accounts";
import { clientFor, HERZLIAH } from "./fixtures/alumni";
import { addressOf, signInAs, stack } from "./fixtures/session";

// The directory and profile pages (DIR-02, DIR-03, CON-02). Seed: Maya Frenkel (00…02) is a published Herzliah
// lawyer in Toronto, class of 1991, with LinkedIn and email public.

const MAYA = "00000000-0000-4000-8000-000000000002";

/** The total search_directory gives the seed alumnus for the same filters. */
async function apiTotal(filters: Record<string, string | string[]>) {
  const peer = await clientFor(accounts.alumni);
  const { data, error } = await peer.rpc("search_directory", {
    p_inst: HERZLIAH,
    p_filters: filters,
    p_limit: 1,
  });
  if (error) throw new Error(error.message);
  return Number(data?.[0]?.total_count ?? 0);
}

test.describe("directory", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signInAs(context, baseURL!, accounts.alumni);
  });

  test("combines filters in the URL, shows them as chips, and resets", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/directory");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find Herzliah alumni");
    await expect(page.getByText(/^\d+ verified members$/)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);

    if (isMobile) await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page.getByLabel("Career field").selectOption({ label: "Law" });
    await expect(page).toHaveURL(/field=law/);
    await page.getByLabel("City").selectOption("Toronto");
    await expect(page).toHaveURL(/city=Toronto/);
    const total = await apiTotal({ career_field: "law", city: "Toronto" });
    expect(total).toBeGreaterThan(0);
    await expect(page.getByRole("status")).toHaveText(new RegExp(`of ${total}$`));
    await expect(page.getByRole("link", { name: /Maya\s+Frenkel/ })).toBeVisible();

    // Each filter is a chip that removes it; the back button returns to the previous search.
    const chips = page.getByRole("list", { name: "Active filters" });
    await expect(chips.getByRole("link")).toHaveCount(2);
    await chips.getByRole("link", { name: /^Toronto/ }).click();
    await expect(page).toHaveURL(/\/directory\?field=law$/);
    await page.goBack();
    await expect(page).toHaveURL(/city=Toronto/);
    await page.getByRole("link", { name: "Reset all" }).first().click();
    await expect(page).toHaveURL(/\/directory$/);
    await expect(chips).toHaveCount(0);
  });

  test("searches names and universities, and several options must all match", async ({ page }) => {
    await page.goto("/directory");
    await page.getByRole("searchbox", { name: "Search alumni" }).fill("Université de Montréal");
    await page.getByRole("searchbox", { name: "Search alumni" }).press("Enter");
    await expect(page).toHaveURL(/q=Universit/);
    const total = await apiTotal({ q: "Université de Montréal" });
    expect(total).toBeGreaterThan(0);
    await expect(page.getByRole("status")).toHaveText(new RegExp(`of ${total}$`));

    await page.goto("/directory?offer=mentoring&offer=career_advice");
    const both = await apiTotal({ offers: ["mentoring", "career_advice"] });
    await expect(page.getByRole("status")).toHaveText(
      both ? new RegExp(`of ${both}$`) : "No results",
    );
    expect(both).toBeLessThanOrEqual(await apiTotal({ offers: ["mentoring"] }));
  });

  test("keeps the home page's class link as a filter", async ({ page }) => {
    await page.goto("/directory?grad_year=1991");
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Class of 1991");
    await expect(page.getByRole("link", { name: /Maya\s+Frenkel/ })).toBeVisible();
  });

  test("opens the filters from a button on a phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phones only");
    await page.goto("/directory");
    const toggle = page.getByRole("button", { name: "Filters", exact: true });
    await expect(page.getByLabel("Career field")).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Career field")).toBeVisible();
  });
});

test.describe("profile", () => {
  test("shows the published profile and reveals the email on request", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    const admin = adminClient(stack);
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const me = users.users.find((user) => user.email === accounts.alumni)!.id;
    const contacts = async () =>
      (
        await admin
          .from("contact_events")
          .select("id", { count: "exact", head: true })
          .eq("initiator_user_id", me)
          .eq("recipient_profile_id", MAYA)
          .eq("channel", "email")
      ).count ?? 0;
    // A reveal within 24 hours is not logged twice, so start from none.
    await admin
      .from("contact_events")
      .delete()
      .eq("initiator_user_id", me)
      .eq("recipient_profile_id", MAYA);

    await page.goto(`/profile/${MAYA}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Maya Frenkel");
    await expect(page.getByText(/Class of 1991/).first()).toBeVisible();
    const linkedin = page.getByRole("link", { name: /^LinkedIn/ });
    await expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/maya-frenkel");
    await expect(linkedin).toHaveAttribute("target", "_blank");
    // The address is not in the page until it is asked for.
    expect(await page.content()).not.toContain("@example.test");
    expect(await blockingViolations(page)).toEqual([]);

    await page.getByRole("button", { name: "Show email" }).click();
    const email = page.getByRole("link", { name: /@/ });
    await expect(email).toHaveAttribute("href", /^mailto:.+@.+/);
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
    expect(await contacts()).toBe(1);
  });

  test("is not found when hidden, at another school, or not an id", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL!, accounts.alumni);
    for (const id of [
      "22222222-2222-4222-8222-000000000002", // hidden member
      "22222222-2222-4222-8222-000000000003", // Test School's alumnus
      "not-an-id",
    ]) {
      const response = await page.goto(addressOf(baseURL!, "herzliah", `/profile/${id}`));
      expect(response?.status(), id).toBe(404);
    }
  });
});
