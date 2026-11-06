import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("is a submit button by default, styled as the primary action", () => {
    render(
      <form>
        <Button>Save</Button>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).not.toHaveAttribute("type");
    expect(button.className).toContain("bg-primary");
  });

  it("while loading, says it is busy, shows a spinner and ignores clicks", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving…
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg.animate-spin")).not.toBeNull();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is not busy when it is not loading", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).toBeEnabled();
    expect(button.querySelector("svg")).toBeNull();
  });

  it("gives its look to a link with asChild, without becoming a button", () => {
    render(
      <Button asChild variant="destructive">
        <a href="/remove">Remove</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Remove" });
    expect(link).toHaveAttribute("href", "/remove");
    expect(link).toHaveAttribute("data-slot", "button");
    expect(link.className).toContain("bg-destructive");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lets a class passed in replace the variant's own", () => {
    render(<Button className="h-10 rounded-sm">Search</Button>);
    const button = screen.getByRole("button", { name: "Search" });
    expect(button.className).toContain("rounded-sm");
    expect(button.className).not.toContain("rounded-md");
    expect(button.className).not.toContain("h-11");
  });
});
