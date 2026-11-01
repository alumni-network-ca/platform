import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { adminClient } from "../scripts/lib/supabase-admin.ts";
import { blockingViolations } from "./fixtures/a11y";
import { directoryHits, onboardedAlumnus, publish } from "./fixtures/alumni";
import { addressOf, signInAs, stack } from "./fixtures/session";

// My profile (PRF-02, PRF-05, PRF-06): the overview, editing a section, publishing and hiding, the data export,
// the yearly confirmation and deleting the profile. Every test makes its own alumnus.

const unique = () =>
  `Me${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.replace(/\d/g, "x");

test.describe("my profile", () => {
  test("shows the profile and saves an edited section", async ({ page, context, baseURL }) => {
    const lastName = unique();
    const { email } = await onboardedAlumnus("Maya", lastName);
    await signInAs(context, baseURL!, email);

    await page.goto("/me");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Maya ${lastName}`);
    await expect(page.getByText("Product Designer · Northline Health").first()).toBeVisible();
    const career = page.getByRole("region", { name: "Career" });
    await expect(career).toContainText("Designer · Shopify");
    await expect(career).toContainText("2018 – 2022");
    const education = page.getByRole("region", { name: "Education" });
    await expect(education).toContainText("McGill University");
    await expect(education).toContainText("Herzliah High School");
    await expect(page.getByRole("region", { name: "Open to" })).toContainText("Mentoring");
    await expect(page.getByText("Hidden from the directory")).toBeVisible();
    await expect(page.getByText("LinkedIn: shown on profile")).toBeVisible();
    await expect(page.getByText("Email: behind a “Show” button")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);

    await page.getByRole("link", { name: "Edit — About" }).click();
    await expect(page).toHaveURL(/\/me\/edit\/about$/);
    await page.getByLabel("City").fill("Montreal");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/me\?saved=1$/);
    await expect(page.getByRole("status")).toHaveText("Your changes are saved.");
    await expect(page.getByText(/Montreal, Canada/)).toBeVisible();

    // Leaving with unsaved changes asks first.
    await page.goto("/me/edit/career");
    await page.getByLabel("Job title").first().fill("Head of Design");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/me\/edit\/career$/);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByText("Product Designer · Northline Health").first()).toBeVisible();
  });

  test("publishes with a consent, then hides the profile", async ({ page, context, baseURL }) => {
    const lastName = unique();
    const { email } = await onboardedAlumnus("Noa", lastName);
    await signInAs(context, baseURL!, email);

    await page.goto("/me/visibility");
    await page.getByRole("radio", { name: /^Verified Herzliah alumni/ }).check();
    await expect(page.getByRole("button", { name: "Accept the policy to finish" })).toBeDisabled();
    await page.getByRole("checkbox", { name: /I've read the/ }).check();
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/me\?saved=1$/);
    await expect(page.getByText("Verified Herzliah alumni")).toBeVisible();
    expect(await directoryHits(lastName)).toHaveLength(1);

    // Hiding needs no consent, and the directory drops the profile at once.
    await page.goto("/me/visibility");
    await page.getByRole("radio", { name: /^Hidden/ }).check();
    await expect(page.getByRole("checkbox", { name: /I've read the/ })).toBeHidden();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Hidden from the directory")).toBeVisible();
    expect(await directoryHits(lastName)).toHaveLength(0);

    // Publishing again uses the consent already on file.
    await page.goto("/me/visibility");
    await page.getByRole("radio", { name: /^Verified Herzliah alumni/ }).check();
    await expect(page.getByRole("checkbox", { name: /I've read the/ })).toBeHidden();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Verified Herzliah alumni")).toBeVisible();
  });

  test("downloads my data as a JSON file", async ({ page, context, baseURL }) => {
    const lastName = unique();
    const { email } = await onboardedAlumnus("Lior", lastName);
    await signInAs(context, baseURL!, email);
    await page.goto("/me");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download my data" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^herzliah-my-data-\d{4}-\d{2}-\d{2}\.json$/);
    const data = JSON.parse(await readFile((await file.path())!, "utf8"));
    expect(data.profile).toMatchObject({ first_name: "Lior", last_name: lastName });
    expect(data.offers).toEqual(["mentoring"]);
    expect(data.contact_channels).toHaveLength(2);
  });

  test("confirms the profile is still accurate when the yearly check is due", async ({
    page,
    context,
    baseURL,
  }) => {
    const { email } = await onboardedAlumnus("Eden", unique());
    const admin = adminClient(stack);
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const userId = users.users.find((user) => user.email === email)!.id;
    const due = await admin
      .from("alumni_profiles")
      .update({ confirmation_due_at: new Date().toISOString() })
      .eq("user_id", userId);
    expect(due.error).toBeNull();

    await signInAs(context, baseURL!, email);
    await page.goto("/me");
    await expect(page.getByText("Your profile is due for its yearly check.")).toBeVisible();
    await page.getByRole("button", { name: "It's still accurate" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Thanks — you confirmed your profile is still accurate.",
    );
    await expect(page.getByRole("button", { name: "It's still accurate" })).toHaveCount(0);
  });

  test("deletes the profile, which leaves the directory and the network", async ({
    page,
    context,
    baseURL,
  }) => {
    const lastName = unique();
    const { email, client } = await onboardedAlumnus("Tal", lastName);
    await publish(client);
    expect(await directoryHits(lastName)).toHaveLength(1);
    await signInAs(context, baseURL!, email);

    await page.goto("/me");
    await page.getByRole("link", { name: "Delete my account" }).click();
    await expect(page).toHaveURL(/\/me\/delete$/);
    await page.getByRole("button", { name: "Delete my profile" }).click();
    await expect(page.getByText("Tick the box to confirm.")).toBeVisible();
    await page.getByRole("checkbox", { name: "I understand this can't be undone." }).check();
    await page.getByRole("button", { name: "Delete my profile" }).click();
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/"));
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
    expect(await directoryHits(lastName)).toHaveLength(0);

    // Signing in again finds no membership here: only the sign-up form.
    await signInAs(context, baseURL!, email);
    await page.goto("/auth/home");
    await expect(page).toHaveURL(addressOf(baseURL!, "herzliah", "/join"));
  });
});
