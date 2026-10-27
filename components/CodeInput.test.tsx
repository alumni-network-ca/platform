import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CodeInput } from "./CodeInput";

function Form() {
  const [code, setCode] = useState("");
  return <CodeInput label="6-digit code" value={code} onChange={setCode} />;
}

const boxes = (container: HTMLElement) =>
  [...container.querySelectorAll(".codeBox")].map((box) => box.textContent);

describe("CodeInput", () => {
  it("is one labelled field that the browser can fill with an emailed code", () => {
    render(<Form />);
    const field = screen.getByLabelText("6-digit code");
    expect(field).toHaveAttribute("autocomplete", "one-time-code");
    expect(field).toHaveAttribute("inputmode", "numeric");
    expect(field).toBeRequired();
  });

  it("shows each digit in its own box, keeping digits only", async () => {
    const { container } = render(<Form />);
    await userEvent.type(screen.getByLabelText("6-digit code"), "4a2-7");
    expect(screen.getByLabelText("6-digit code")).toHaveValue("427");
    expect(boxes(container)).toEqual(["4", "2", "7", "", "", ""]);
  });

  it("takes a pasted code with spaces, and stops at six digits", async () => {
    const { container } = render(<Form />);
    const field = screen.getByLabelText("6-digit code");
    await userEvent.click(field);
    await userEvent.paste("123 456");
    expect(field).toHaveValue("123456");
    await userEvent.type(field, "9");
    expect(field).toHaveValue("123456");
    expect(boxes(container)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("marks the box the next digit goes into while focused", async () => {
    const { container } = render(<Form />);
    const current = () =>
      [...container.querySelectorAll(".codeBox")].findIndex((box) =>
        box.hasAttribute("data-current"),
      );
    expect(current()).toBe(-1);
    await userEvent.type(screen.getByLabelText("6-digit code"), "12");
    expect(current()).toBe(2);
    await userEvent.type(screen.getByLabelText("6-digit code"), "{Backspace}");
    expect(current()).toBe(1);
  });

  it("keeps the digits out of the label, and the boxes from screen readers", async () => {
    const { container } = render(<Form />);
    await userEvent.type(screen.getByLabelText("6-digit code"), "12");
    expect(container.querySelector("label")).toHaveTextContent(/^6-digit code$/);
    for (const box of container.querySelectorAll(".codeBox")) {
      expect(box).toHaveAttribute("aria-hidden", "true");
    }
  });
});
