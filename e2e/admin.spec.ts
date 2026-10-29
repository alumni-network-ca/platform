import { expect, test } from "@playwright/test";
import { adminClient } from "../scripts/lib/supabase-admin";
import { accounts } from "./fixtures/accounts";
import { signInAs, stack } from "./fixtures/session";
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
