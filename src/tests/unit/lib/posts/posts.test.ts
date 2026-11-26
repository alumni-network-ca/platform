import { describe, expect, it } from "vitest";
import {
  hostOf,
  isHttpsUrl,
  isLive,
  postState,
  schoolTimeToDate,
  schoolToday,
  toSchoolTime,
  groupByMonth,
  monthBounds,
  monthLabel,
  schoolMonth,
} from "@/lib/posts/posts";

describe("isHttpsUrl (the database's check on fundraising links)", () => {
  it("accepts an https address with a host name", () => {
    expect(isHttpsUrl("https://give.herzliah.ca/library")).toBe(true);
    expect(isHttpsUrl("https://www.canadahelps.org/en/dn/12345?x=1#top")).toBe(true);
    expect(isHttpsUrl("https://give.test:8443/x")).toBe(true);
  });

  it("refuses http, other schemes, credentials, bare hosts and spaces", () => {
    for (const url of [
      "http://give.herzliah.ca",
      "javascript:alert(1)",
      "https://user:pass@give.test/x",
      "https://localhost/x",
      "https://give.test/a b",
      "https://give.test/<script>",
      `https://give.test/${"a".repeat(2000)}`,
    ])
      expect(isHttpsUrl(url)).toBe(false);
  });

  it("shows the host alumni will land on", () => {
    expect(hostOf("https://www.canadahelps.org/en/dn/1")).toBe("canadahelps.org");
    expect(hostOf("https://give.herzliah.ca/x")).toBe("give.herzliah.ca");
  });
});

describe("postState", () => {
  const now = new Date("2026-11-24T15:00:00Z"); // 10:00 in Montreal
  const post = (over: Partial<Parameters<typeof postState>[0]>) => ({
    status: "published" as const,
    publish_at: "2026-11-20T12:00:00Z",
    ends_on: null,
    ...over,
  });

  it("reads drafts, schedules, live, ended and archived posts", () => {
    expect(postState(post({ status: "draft", publish_at: null }), now)).toBe("draft");
    expect(postState(post({ publish_at: "2026-12-01T14:00:00Z" }), now)).toBe("scheduled");
    expect(postState(post({}), now)).toBe("published");
    expect(postState(post({ ends_on: "2026-11-23" }), now)).toBe("ended");
    expect(postState(post({ status: "archived" }), now)).toBe("archived");
  });

  it("keeps a campaign live through its last day, in school time", () => {
    expect(isLive(post({ ends_on: "2026-11-24" }), now)).toBe(true);
    // 03:00 UTC on the 25th is still the evening of the 24th in Montreal.
    expect(schoolToday(new Date("2026-11-25T03:00:00Z"))).toBe("2026-11-24");
  });
});

describe("school time", () => {
  it("reads a datetime-local value in Montreal time, across daylight saving", () => {
    expect(schoolTimeToDate("2026-12-02T09:00")?.toISOString()).toBe("2026-12-02T14:00:00.000Z");
    expect(schoolTimeToDate("2026-07-02T09:00")?.toISOString()).toBe("2026-07-02T13:00:00.000Z");
  });

  it("refuses what is not a time", () => {
    expect(schoolTimeToDate("tomorrow")).toBeNull();
    expect(schoolTimeToDate("2026-02-31T09:00")).toBeNull();
  });

  it("round-trips through the field's format", () => {
    expect(toSchoolTime(new Date("2026-12-02T14:00:00Z"))).toBe("2026-12-02T09:00");
    expect(toSchoolTime(schoolTimeToDate("2026-03-08T12:30")!)).toBe("2026-03-08T12:30");
  });
});

describe("groupByMonth (the posts list's month headings)", () => {
  it("reads the month in the schools' zone, not UTC", () => {
    // 1 December 03:00 UTC is still 30 November in Montreal.
    expect(schoolMonth(new Date("2026-12-01T03:00:00Z"))).toBe("2026-11");
    expect(schoolMonth(new Date("2026-12-01T06:00:00Z"))).toBe("2026-12");
  });

  it("keeps the order and starts a group at each new month", () => {
    const posts = [
      { id: "a", publish_at: "2026-11-20T15:00:00Z" },
      { id: "b", publish_at: "2026-11-02T15:00:00Z" },
      { id: "c", publish_at: "2026-10-28T15:00:00Z" },
      { id: "d", publish_at: null },
      { id: "e", publish_at: "2025-11-15T15:00:00Z" },
    ];
    expect(groupByMonth(posts).map((g) => [g.month, g.posts.map((p) => p.id)])).toEqual([
      ["2026-11", ["a", "b"]],
      ["2026-10", ["c"]],
      ["2025-11", ["e"]],
    ]);
  });
});

describe("monthLabel and monthBounds", () => {
  it("names a month in either language, capitalised", () => {
    expect(monthLabel("2026-11", "en-CA")).toBe("November 2026");
    expect(monthLabel("2026-11", "fr-CA")).toBe("Novembre 2026");
    expect(monthLabel("2026-11", "fr-CA", { heading: false })).toBe("novembre 2026");
  });

  it("starts and ends a month at midnight in Montreal, across the year end", () => {
    const [start, end] = monthBounds("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T05:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T05:00:00.000Z");
    expect(monthBounds("2026-07")[0].toISOString()).toBe("2026-07-01T04:00:00.000Z");
  });
});
