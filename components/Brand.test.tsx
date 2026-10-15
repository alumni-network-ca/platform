import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Brand } from "./Brand";

describe("Brand", () => {
  it("links to the home page with an accessible name", () => {
    render(<Brand />);
    const link = screen.getByRole("link", { name: "Herzliah Alumni Network home" });
    expect(link).toHaveAttribute("href", "/");
    expect(screen.getByAltText("Herzliah logo")).toBeInTheDocument();
  });
});
