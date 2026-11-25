import { expect, test } from "@playwright/test";
import { adminClient } from "@scripts/lib/supabase-admin";
import { accounts } from "./fixtures/accounts";
import { blockingViolations } from "./fixtures/a11y";
import { addressOf, signInAs, stack } from "./fixtures/session";

// School posts (POST-05): a school admin writes one post of each kind and publishes it; an alumnus reads them, and
// the fundraising button records the click and sends them on. Runs at the second school, so Herzliah's nav tests
// (which expect no Posts link) are not affected by these posts.
const school = "aaaaaaaa-0000-4000-8000-000000000002";

test("a school admin publishes news and fundraising, and alumni read them", async ({
  page,
  context,
  baseURL,
}) => {
  // Two posts written, published and read: longer than one page's worth of steps.
  test.setTimeout(120_000);
  const owner = adminClient(stack);
  const tag = crypto.randomUUID().slice(0, 8);
  const news = `E2E news ${tag}`;
  const fund = `E2E campaign ${tag}`;
  const site = (path: string) => addressOf(baseURL!, "test-school", path);
  try {
    await signInAs(context, site("/"), accounts.testSchoolAdmin);

    // News, through the rich-text editor.
    await page.goto(site("/admin/posts/new?kind=news"));
    await page.getByLabel("Title").fill(news);
    const story = page.getByRole("textbox", { name: "Story" });
    await story.click();
    await page.getByRole("button", { name: "Heading", exact: true }).click();
    await page.keyboard.type("Ten years later");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Eighty graduates came back for an evening of stories.");
    await page.getByRole("radio", { name: "Publish now" }).check();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published. Alumni can see it now.")).toBeVisible();

    // Fundraising: an http link is refused before it reaches the database.
    await page.goto(site("/admin/posts/new?kind=fundraising"));
    await page.getByLabel("Title").fill(fund);
    await page.getByLabel("Description").fill("Help us renew the library.");
    const link = page.getByLabel("Donation link");
    await link.fill("http://give.example.test/library");
    await link.blur();
    await expect(page.getByText("The link must start with https://")).toBeVisible();
    await link.fill("https://give.example.test/library");
    await page.getByRole("radio", { name: "Publish now" }).check();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published. Alumni can see it now.")).toBeVisible();

    // The alumnus sees both, filters, and leaves through the recorded button.
    await context.clearCookies();
    await signInAs(context, site("/"), accounts.testSchoolAlumni);
    await page.goto(site("/posts"));
    await expect(page.getByRole("link", { name: "Posts", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: news })).toBeVisible();
    await expect(page.getByRole("heading", { name: fund })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);

    await page.getByRole("link", { name: "Fundraising", exact: true }).click();
    await expect(page.getByRole("heading", { name: news })).toHaveCount(0);
    const card = page.getByRole("article").filter({ hasText: fund });
    await expect(card).toContainText("You will leave");
    const give = card.getByRole("link", { name: /Give on give\.example\.test/ });
    await expect(give).toHaveAttribute("target", "_blank");
    // A new tab goes through our /go (which records the click) and is redirected to the campaign. The campaign's
    // site does not exist, so the test checks the tab asks for it rather than that it loads.
    const [outbound] = await Promise.all([
      context.waitForEvent("request", (r) => r.url() === "https://give.example.test/library"),
      give.click(),
    ]);
    expect(outbound.redirectedFrom()?.url()).toMatch(/\/posts\/[0-9a-f-]{36}\/go$/);

    const { data: post } = await owner
      .from("school_posts")
      .select("id")
      .eq("institution_id", school)
      .eq("title", fund)
      .single();
    const { count } = await owner
      .from("post_link_clicks")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post!.id);
    expect(count).toBe(1);

    await page.goto(site("/posts?kind=news"));
    await page.getByRole("link", { name: news }).click();
    await expect(page.getByRole("heading", { name: "Ten years later" })).toBeVisible();
  } finally {
    await owner
      .from("school_posts")
      .delete()
      .eq("institution_id", school)
      .like("title", `E2E % ${tag}`);
  }
});

test("a reviewer cannot open the posts admin", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, accounts.reviewer);
  const response = await page.goto("/admin/posts");
  expect(response?.status()).toBe(403);
});
