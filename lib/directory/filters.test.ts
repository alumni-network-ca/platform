import { describe, expect, it } from "vitest";
import {
  activeChips,
  directoryHref,
  pages,
  readFilters,
  rpcFilters,
  type Filters,
} from "./filters";

const none = readFilters({});
const labels = {
  field: (key: string) => `field:${key}`,
  offer: (key: string) => `offer:${key}`,
  decade: (decade: number) => `${decade}s`,
  classOf: (year: number) => `Class of ${year}`,
};

describe("readFilters", () => {
  it("starts with no filters, the recent sort and page 1", () => {
    expect(none).toEqual({
      q: "",
      field: "",
      school: "",
      city: "",
      decade: null,
      gradYear: null,
      offers: [],
      sort: "recent",
      page: 1,
    });
  });

  it("reads every filter, several options and the home page's class link", () => {
    expect(
      readFilters({
        q: " lawyer ",
        field: "law",
        school: "McGill University",
        city: "Montreal",
        class: "2010",
        grad_year: "2014",
        offer: ["mentoring", "career_advice", "mentoring"],
        sort: "name",
        page: "3",
      }),
    ).toEqual({
      q: "lawyer",
      field: "law",
      school: "McGill University",
      city: "Montreal",
      decade: 2010,
      gradYear: 2014,
      offers: ["mentoring", "career_advice"],
      sort: "name",
      page: 3,
    });
  });

  it("ignores values it can't use", () => {
    expect(
      readFilters({ class: "2014", grad_year: "14", page: "-2", sort: "random" }),
    ).toMatchObject({
      decade: null,
      gradYear: null,
      page: 1,
      sort: "recent",
    });
  });
});

describe("rpcFilters", () => {
  it("sends only the filters in use, a decade as a class range", () => {
    expect(rpcFilters(none)).toEqual({});
    expect(
      rpcFilters({
        ...none,
        q: "x",
        field: "law",
        decade: 1990,
        offers: ["mentoring"],
        gradYear: 1995,
      }),
    ).toEqual({
      q: "x",
      career_field: "law",
      class_from: 1990,
      class_to: 1999,
      grad_year: 1995,
      offers: ["mentoring"],
    });
  });
});

describe("links", () => {
  const f: Filters = {
    ...none,
    q: "dana",
    city: "Toronto",
    offers: ["mentoring", "hiring"],
    page: 2,
  };

  it("round-trips through the query string, leaving out defaults", () => {
    expect(directoryHref(none)).toBe("/directory");
    expect(directoryHref(f)).toBe(
      "/directory?q=dana&city=Toronto&offer=mentoring&offer=hiring&page=2",
    );
    const params = Object.fromEntries(
      [...new URL(`http://x${directoryHref(f)}`).searchParams.entries()].reduce(
        (all, [k, v]) => all.set(k, [...(all.get(k) ?? []), v]),
        new Map<string, string[]>(),
      ),
    );
    expect(readFilters(params)).toEqual(f);
  });

  it("gives each filter in use a chip that removes it and goes back to page 1", () => {
    expect(activeChips(f, labels)).toEqual([
      { key: "q", label: "“dana”", href: "/directory?city=Toronto&offer=mentoring&offer=hiring" },
      { key: "city", label: "Toronto", href: "/directory?q=dana&offer=mentoring&offer=hiring" },
      {
        key: "offer:mentoring",
        label: "offer:mentoring",
        href: "/directory?q=dana&city=Toronto&offer=hiring",
      },
      {
        key: "offer:hiring",
        label: "offer:hiring",
        href: "/directory?q=dana&city=Toronto&offer=mentoring",
      },
    ]);
  });

  it("pages through the results", () => {
    expect(pages({ ...none, page: 2 }, 50)).toEqual({
      last: 3,
      previous: "/directory",
      next: "/directory?page=3",
      from: 25,
      to: 48,
    });
    expect(pages(none, 0)).toEqual({ last: 1, previous: null, next: null, from: 0, to: 0 });
  });
});
