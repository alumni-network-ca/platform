import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SubmitButton } from "@/components/ui/submit-button";

describe("SubmitButton", () => {
  it("is busy while its form's action runs, then ready again", async () => {
    let finish!: () => void;
    const action = () => new Promise<void>((resolve) => (finish = resolve));
    render(
      <form action={action}>
        <SubmitButton>Save</SubmitButton>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).not.toHaveAttribute("aria-busy");

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
    expect(button).toBeDisabled();
    expect(button.querySelector("svg.animate-spin")).not.toBeNull();

    finish();
    await waitFor(() => expect(button).not.toHaveAttribute("aria-busy"));
    expect(button).toBeEnabled();
  });
});
