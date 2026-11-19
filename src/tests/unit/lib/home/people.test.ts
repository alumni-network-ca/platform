import { describe, expect, it } from "vitest";
import {
  classmateCount,
  confirmationDue,
  displayName,
  latestContacts,
  others,
} from "@/lib/home/people";

describe("others", () => {
  const rows = ["a", "me", "b", "c", "d"].map((id) => ({ id }));

  it("drops the reader's own profile and keeps three", () => {
    expect(others(rows, "me").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps what there is when fewer people are listed", () => {
    expect(others([{ id: "me" }, { id: "a" }], "me")).toEqual([{ id: "a" }]);
    expect(others([], "me")).toEqual([]);
  });
});

describe("classmateCount", () => {
  it("leaves the reader out of their own class", () => {
    expect(classmateCount(38, true)).toBe(37);
    expect(classmateCount(38, false)).toBe(38);
    expect(classmateCount(0, true)).toBe(0);
  });
});

describe("latestContacts", () => {
  it("lists each person once, by their latest contact, newest first", () => {
    const events = [
      { recipient_profile_id: "a", channel: "email", created_at: "2026-10-01T10:00:00Z" },
      { recipient_profile_id: "b", channel: "linkedin", created_at: "2026-10-20T10:00:00Z" },
      { recipient_profile_id: "a", channel: "phone", created_at: "2026-10-21T10:00:00Z" },
    ];
    expect(latestContacts(events)).toEqual([events[2], events[1]]);
  });

  it("stops at five people", () => {
    const events = Array.from({ length: 8 }, (_, i) => ({
      recipient_profile_id: `p${i}`,
      channel: "email",
      created_at: `2026-10-0${i + 1}T00:00:00Z`,
    }));
    expect(latestContacts(events).map((e) => e.recipient_profile_id)).toEqual([
      "p7",
      "p6",
      "p5",
      "p4",
      "p3",
    ]);
  });
});

describe("displayName", () => {
  it("uses the preferred first name when there is one", () => {
    expect(displayName({ first_name: "Daniela", last_name: "Levy", preferred_name: "Dana" })).toBe(
      "Dana Levy",
    );
    expect(displayName({ first_name: "Daniela", last_name: "Levy", preferred_name: "" })).toBe(
      "Daniela Levy",
    );
  });
});

describe("confirmationDue", () => {
  const now = new Date("2026-11-01T12:00:00Z");

  it("asks once the due date has passed", () => {
    expect(confirmationDue("2026-10-31T00:00:00Z", now)).toBe(true);
    expect(confirmationDue("2026-11-01T12:00:00Z", now)).toBe(true);
    expect(confirmationDue("2027-10-31T00:00:00Z", now)).toBe(false);
  });

  it("does not ask without a due date", () => {
    expect(confirmationDue(null, now)).toBe(false);
  });
});
