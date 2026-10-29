import { describe, expect, it } from "vitest";
import { describeAudit } from "./audit";
import { translations } from "@/lib/i18n";
const row = {
  actor_user_id: "actor",
  actor_kind: "member",
  action: "profile.status",
  target_type: "alumni_profile",
  target_id: "00000000-0000-4000-8000-000000000001",
  metadata: { from: "active", to: "suspended", reason: "Asked to pause" },
};
const people = [{ user_id: "actor", label: "Ruth Klein", kind: "staff" }];
describe("audit sentences", () => {
  it("names the actor, action, reason and record link", () => {
    expect(describeAudit(row, people, translations.en.admin)).toMatchObject({
      actor: "Ruth Klein",
      what: "changed a record’s status",
      details: "Active · → Suspended · Asked to pause",
      targetHref: "/admin/alumni/" + row.target_id,
    });
  });
  it("uses French sentences", () =>
    expect(describeAudit(row, people, translations.fr.admin).text).toBe(
      "Ruth Klein a changé le statut d’un dossier",
    ));
  it("never exposes a support actor's supplied email", () =>
    expect(
      describeAudit(
        { ...row, actor_kind: "system_admin" },
        [{ ...people[0]!, label: "private@example.test" }],
        translations.fr.admin,
      ).actor,
    ).toBe("Soutien de la plateforme"));
  it("handles deleted actors, system jobs and future actions", () => {
    expect(describeAudit({ ...row, actor_user_id: null }, [], translations.en.admin).actor).toBe(
      "Former user",
    );
    expect(
      describeAudit(
        { ...row, actor_kind: "system", action: "future.event", metadata: [] },
        people,
        translations.en.admin,
      ),
    ).toMatchObject({ actor: "System", what: "recorded an event", details: "" });
  });
});
