import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicSchool } from "@/lib/school";
import { Brand } from "./Brand";
import { SchoolProvider } from "./SchoolProvider";

const herzliah: PublicSchool = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  name: "Herzliah High School",
  slug: "herzliah",
  default_locale: "en",
  branding: { short_name: "Herzliah", logo: "/herzliah-logo.png" },
};
const testSchool: PublicSchool = {
  id: "aaaaaaaa-0000-4000-8000-000000000002",
  name: "Test School",
  slug: "test-school",
  default_locale: "fr",
  branding: {},
};

const renderFor = (school: PublicSchool) =>
  render(
    <SchoolProvider school={school}>
      <Brand />
    </SchoolProvider>,
  );

describe("Brand", () => {
  it("links to the home page, named by its visible text", () => {
    const { container } = renderFor(herzliah);
    const link = screen.getByRole("link", { name: /^Herzliah Alumni Network/ });
    expect(link).toHaveAttribute("href", "/");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("shows each school's own name, and initials when it has no logo", () => {
    const { container } = renderFor(testSchool);
    expect(screen.getByRole("link", { name: /^Test School Alumni Network/ })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".brandMonogram")).toHaveTextContent("TS");
  });
});
