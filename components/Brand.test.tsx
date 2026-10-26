import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Brand } from "./Brand";

describe("Brand", () => {
  it("links to the home page, named by its visible text", () => {
    const { container } = render(<Brand />);
    const link = screen.getByRole("link", { name: /^Herzliah Alumni Network/ });
    expect(link).toHaveAttribute("href", "/");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
