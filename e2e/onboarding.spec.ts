import { expect, test, type Page } from "@playwright/test";
import { blockingViolations } from "./fixtures/a11y";
import { accounts } from "./fixtures/accounts";
import { approvedAlumnus, clientFor, HERZLIAH } from "./fixtures/alumni";
import { signInAs } from "./fixtures/session";

// The onboarding wizard (ONB-05): a newly approved alumnus fills in each step and publishes. Every test makes its
// own alumnus, so the seed accounts keep their state.

const unique = () =>
  `Onb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.replace(/\d/g, "x");
const next = (page: Page) => page.getByRole("button", { name: "Save and continue" }).click();

test.describe("onboarding", () => {
  test("an approved alumnus fills in every step and publishes", async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const lastName = unique();
    await signInAs(context, baseURL!, await approvedAlumnus("Dana", lastName));

    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/onboarding\/welcome$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Welcome to the Herzliah network",
    );
    await expect(page.getByRole("radio", { name: "English" })).toBeChecked();
    await page.getByRole("button", { name: "Get started" }).click();

    // About: the school's data is filled in; a missing name is refused and the other values stay.
    await expect(page).toHaveURL(/\/onboarding\/about$/);
    await expect(page.getByLabel("First name")).toHaveValue("Dana");
    await expect(page.getByText("2014", { exact: false }).first()).toBeVisible();
    await page.getByLabel("Last name").fill("");
    await page.getByLabel("City").fill("Toronto");
    await page.getByRole("checkbox", { name: "French" }).check();
    await next(page);
    await expect(page.getByText("Fill this in.")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeFocused();
    await expect(page.getByLabel("City")).toHaveValue("Toronto");
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByLabel("Last name").fill(lastName);
    await next(page);

    await expect(page).toHaveURL(/\/onboarding\/education$/);
    await page.getByRole("textbox", { name: "School or university" }).fill("McGill University");
    await page.getByLabel("Year").fill("2018");
    await next(page);

    // Career: the current role on the profile, an earlier one as experience; years out of order are refused.
    await expect(page).toHaveURL(/\/onboarding\/career$/);
    await page.getByLabel("Career field").selectOption({ label: "Technology" });
    await page.getByLabel("Job title").first().fill("Senior Software Engineer");
    await page.getByLabel("Current employer").fill("Northline Health");
    const role = page.getByRole("group", { name: "Previous roles 1" });
    await role.getByLabel("Job title").fill("Software Engineer");
    await role.getByLabel("From").fill("2019");
    await role.getByLabel("To").fill("2017");
    await next(page);
    await expect(page.getByText("The end year can't be before the start year.")).toBeVisible();
    await role.getByLabel("To").fill("2023");
    await next(page);

    await expect(page).toHaveURL(/\/onboarding\/networking$/);
    await page.getByRole("checkbox", { name: /^Mentoring/ }).check();
    await page.getByRole("checkbox", { name: /^Career advice/ }).check();
    await expect(page.getByText("(2 selected)")).toBeVisible();
    await next(page);

    // Contact: the account email is offered; a phone must be international.
    await expect(page).toHaveURL(/\/onboarding\/contact$/);
    await expect(page.getByRole("textbox", { name: "Email" })).not.toHaveValue("");
    await page.getByRole("textbox", { name: "Phone" }).fill("514 555 0123");
    await page.getByRole("textbox", { name: "LinkedIn" }).fill("linkedin.com/in/dana");
    await page.getByRole("checkbox", { name: "Show on my profile (LinkedIn)" }).check();
    await next(page);
    await expect(
      page.getByText("Use the international format, such as +1 514 555 0123."),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "LinkedIn" })).toHaveValue(
      "linkedin.com/in/dana",
    );
    await page.getByRole("textbox", { name: "Phone" }).fill("+1 514 555 0123");
    await next(page);

    // Publish: nothing is possible before the consent, and the preview shows the directory card.
    await expect(page).toHaveURL(/\/onboarding\/publish$/);
    const finish = page.getByRole("button", { name: "Accept the policy to finish" });
    await expect(finish).toBeDisabled();
    await page.getByRole("radio", { name: /^Verified Herzliah alumni/ }).check();
    const preview = page.getByRole("complementary", {
      name: "How alumni will see you in the directory",
    });
    await expect(preview).toContainText(`Dana ${lastName}`);
    await expect(preview).toContainText("Senior Software Engineer · Northline Health · Toronto");
    await page.getByRole("checkbox", { name: /I've read the/ }).check();
    expect(await blockingViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Publish my profile" }).click();
    await expect(page).toHaveURL(/\/directory$/);

    // Another alumnus finds the profile, with what was saved along the way.
    const peer = await clientFor(accounts.alumni);
    const { data, error } = await peer.rpc("search_directory", {
      p_inst: HERZLIAH,
      p_filters: { q: lastName },
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      first_name: "Dana",
      job_title: "Senior Software Engineer",
      employer: "Northline Health",
      city: "Toronto",
      career_field_key: "technology",
      schools: ["McGill University"],
    });
    expect([...data![0]!.offers].sort()).toEqual(["career_advice", "mentoring"]);

    // Done: the wizard sends the alumnus home instead of starting again.
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/directory$/);
  });

  test("a later step waits for the earlier ones, and the wizard speaks French", async ({
    page,
    context,
    baseURL,
    isMobile,
  }) => {
    await signInAs(context, baseURL!, await approvedAlumnus("Noa", unique()));
    await page.goto("/onboarding/publish");
    await expect(page).toHaveURL(/\/onboarding\/welcome$/);
    // Phones show only the card's step count; the list of steps is for wider screens.
    const rail = page.getByRole("navigation", { name: "Set up your profile" });
    await expect(rail).toBeVisible({ visible: !isMobile });

    await page.getByRole("radio", { name: "Français" }).check();
    await page.getByRole("button", { name: "Get started" }).click();
    await expect(page).toHaveURL(/\/onboarding\/about$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("À propos de vous");
    await expect(page.getByText("Étape 2 sur 7")).toBeVisible();
    if (!isMobile)
      await expect(
        page
          .getByRole("navigation", { name: "Créer votre profil" })
          .getByRole("link", { name: "Bienvenue" }),
      ).toBeVisible();
    await expect(page.getByRole("button", { name: "Enregistrer et continuer" })).toBeVisible();
  });
});
