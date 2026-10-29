import { expect, test } from "@playwright/test";
import { adminClient } from "../scripts/lib/supabase-admin";
import { accounts } from "./fixtures/accounts";
import { signInAs, stack, addressOf } from "./fixtures/session";
import { blockingViolations } from "./fixtures/a11y";
const school = "aaaaaaaa-0000-4000-8000-000000000001";
for (const role of ["admin", "reviewer"] as const) {
  test(role + " sees the school console", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, accounts[role]);
    await page.goto("/admin");
    const sidebar = page.getByRole("navigation", { name: "Dashboard", exact: true });
    await expect(sidebar.getByRole("link")).toHaveCount(role === "reviewer" ? 4 : 7);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
test("alumni cannot open the console", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, accounts.alumni);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/directory$/);
});
for (const decision of ["approve", "needs_info", "reject"] as const) {
  test("reviewer can " + decision + " a request", async ({ page, context, baseURL }) => {
    const owner = adminClient(stack);
    const email = "admin-e2e-" + crypto.randomUUID() + "@example.test";
    const created = await owner.auth.admin.createUser({ email, email_confirm: true });
    if (created.error) throw created.error;
    const uid = created.data.user.id;
    try {
      const fixture = await owner
        .from("access_requests")
        .insert({
          institution_id: school,
          user_id: uid,
          email,
          first_name: "Test",
          last_name: "Applicant",
          grad_year: 2014,
        })
        .select("id")
        .single();
      if (fixture.error) throw fixture.error;
      await signInAs(context, baseURL!, accounts.reviewer);
      await page.goto("/admin/approvals/" + fixture.data.id);
      const label =
        decision === "approve"
          ? "Approve"
          : decision === "needs_info"
            ? "Ask for more info"
            : "Reject";
      await page.getByRole("radio", { name: label, exact: true }).check();
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/approvals\?tab=/);
      const result = await owner
        .from("access_requests")
        .select("status,profile_id")
        .eq("id", fixture.data.id)
        .single();
      expect(result.data?.status).toBe(
        decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "needs_info",
      );
      if (decision !== "needs_info") {
        await page.goto("/admin/approvals/" + fixture.data.id);
        await expect(page.getByText("This request has already been decided.")).toBeVisible();
        await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
      }
      expect(await blockingViolations(page)).toEqual([]);
      if (result.data?.profile_id)
        await owner.from("alumni_profiles").delete().eq("id", result.data.profile_id);
    } finally {
      await owner.auth.admin.deleteUser(uid);
    }
  });
}

test("reviewers cannot edit records or change status", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, accounts.reviewer);
  const id = "00000000-0000-4000-8000-000000000001";
  await page.goto("/admin/alumni/" + id);
  await expect(page.getByRole("link", { name: "Edit record", exact: true })).toHaveCount(0);
  for (const route of ["edit", "status"]) {
    await page.goto("/admin/alumni/" + id + "/" + route);
    await expect(
      page.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeVisible();
  }
});
test("admin suspends an unclaimed record and the reason reaches the audit log", async ({
  page,
  context,
  baseURL,
}) => {
  const owner = adminClient(stack);
  const fixture = await owner
    .from("alumni_profiles")
    .insert({ institution_id: school, first_name: "Status", last_name: "Test", grad_year: 2002 })
    .select("id")
    .single();
  if (fixture.error) throw fixture.error;
  try {
    await signInAs(context, baseURL!, accounts.admin);
    await page.goto("/admin/alumni/" + fixture.data.id + "/status");
    const submit = page.getByRole("button", { name: "Suspend", exact: true });
    await expect(submit).toBeDisabled();
    const reason = "Access paused for e2e " + fixture.data.id;
    await page.getByLabel("Reason (required, kept in the audit log)").fill(reason);
    await submit.click();
    await expect(page).toHaveURL(/tab=history/);
    await expect(page.getByText(reason, { exact: false })).toBeVisible();
    const audit = await owner
      .from("audit_log")
      .select("metadata")
      .eq("target_id", fixture.data.id)
      .eq("action", "profile.status")
      .single();
    expect(audit.data?.metadata).toMatchObject({ reason });
    expect(await blockingViolations(page)).toEqual([]);
  } finally {
    await owner.from("alumni_profiles").delete().eq("id", fixture.data.id);
  }
});

test("reviewer receives 403 on staff management", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, accounts.reviewer);
  const response = await page.goto("/admin/staff");
  expect(response?.status()).toBe(403);
  await expect(
    page.getByRole("heading", { name: "You do not have access to this page" }),
  ).toBeVisible();
});

test("school admin invites and revokes staff", async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, accounts.admin);
  await page.goto("/admin/staff");
  const email = "staff-e2e-" + crypto.randomUUID() + "@example.test";
  await page.getByLabel("Invite by email").fill(email);
  await page.getByRole("button", { name: "Send invitation", exact: true }).click();
  const inviteForm = page
    .getByRole("button", { name: "Send invitation", exact: true })
    .locator("..")
    .locator("..");
  await expect(inviteForm.getByLabel("Invitation link")).toHaveValue(/\/staff\/accept\?token=/);
  const invitation = page
    .getByRole("heading", { name: "Open invitations" })
    .locator("..")
    .getByText(email, { exact: true })
    .locator("..");
  await invitation.getByRole("button", { name: "Resend invitation", exact: true }).click();
  await expect(invitation.getByLabel("Invitation link")).toHaveValue(/token=/);
  await invitation.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toHaveCount(0);
  expect(await blockingViolations(page)).toEqual([]);
});

test("admin saves school settings without changing branding", async ({
  page,
  context,
  baseURL,
}) => {
  const owner = adminClient(stack);
  const slug = "settings-" + crypto.randomUUID().slice(0, 12);
  const branding = {
    short_name: "Settings test",
    primary_color: "#0B2159",
    accent_color: "#7B1E3D",
  };
  const fixture = await owner
    .from("institutions")
    .insert({ name: "Settings test school", slug, branding })
    .select("id")
    .single();
  if (fixture.error) throw fixture.error;
  const member = await owner.from("institution_memberships").insert({
    institution_id: fixture.data.id,
    user_id: "11111111-1111-4111-8111-000000000001",
    role: "school_admin",
  });
  if (member.error) throw member.error;
  const address = addressOf(baseURL!, slug);
  await signInAs(context, address, accounts.admin);
  await page.goto(addressOf(baseURL!, slug, "/admin/settings"));
  await page.getByLabel("Sender name").fill("The alumni office");
  await page.getByLabel("Replies go to").fill("office@example.test");
  await page.getByLabel("Default language").selectOption("fr");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved.");
  const result = await owner
    .from("institutions")
    .select("email_display_name,reply_to_email,default_locale,branding")
    .eq("id", fixture.data.id)
    .single();
  expect(result.data).toEqual({
    email_display_name: "The alumni office",
    reply_to_email: "office@example.test",
    default_locale: "fr",
    branding,
  });
  expect(await blockingViolations(page)).toEqual([]);
});

test("school admin approves the submitted template in both languages", async ({
  page,
  context,
  baseURL,
}) => {
  const owner = adminClient(stack);
  const slug = "templates-" + crypto.randomUUID().slice(0, 12);
  const fixture = await owner
    .from("institutions")
    .insert({ name: "Templates test school", slug })
    .select("id")
    .single();
  if (fixture.error) throw fixture.error;
  const member = await owner.from("institution_memberships").insert({
    institution_id: fixture.data.id,
    user_id: "11111111-1111-4111-8111-000000000001",
    role: "school_admin",
  });
  if (member.error) throw member.error;
  const address = addressOf(baseURL!, slug);
  await signInAs(context, address, accounts.admin);
  for (const locale of ["en", "fr"] as const) {
    await page.goto(
      addressOf(baseURL!, slug, "/admin/templates?key=access_approved&locale=" + locale),
    );
    await page.getByLabel("Subject", { exact: true }).fill("Class {graduation_year}");
    await page.getByLabel("Message", { exact: true }).fill("Hello {first_name} ");
    await page.getByRole("button", { name: "{onboarding_link}", exact: true }).click();
    await page.getByRole("button", { name: "Approve this version", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Changes saved.");
    const result = await owner
      .from("email_templates")
      .select("subject,body,status")
      .eq("institution_id", fixture.data.id)
      .eq("key", "access_approved")
      .eq("locale", locale)
      .single();
    expect(result.data).toEqual({
      subject: "Class {graduation_year}",
      body: "Hello {first_name} {onboarding_link}",
      status: "approved",
    });
    expect(await blockingViolations(page)).toEqual([]);
  }
});
test("reviewer is forbidden from templates and school settings", async ({
  page,
  context,
  baseURL,
}) => {
  await signInAs(context, baseURL!, accounts.reviewer);
  for (const path of ["/admin/templates", "/admin/settings"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(403);
    await expect(
      page.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeVisible();
  }
});
