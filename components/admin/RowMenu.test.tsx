import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { translations } from "@/lib/i18n";
import type { ActionResult } from "@/lib/admin/forms";
import { RowMenu, type RowMenuItem } from "./RowMenu";

const t = translations.en.admin;
const items: RowMenuItem[] = [
  { key: "resend", label: "Resend invitation", fields: { operation: "resend", invitation: "i1" } },
  {
    key: "revoke",
    label: "Revoke",
    fields: { operation: "revoke", invitation: "i1" },
    danger: true,
    confirm: "Revoke it?",
  },
];

function setup(result: ActionResult = { error: null, saved: true }) {
  const action = vi.fn(async (_: ActionResult, form: FormData) => {
    void form;
    return result;
  });
  render(
    <>
      <RowMenu action={action} items={items} label="Actions for avi@school.test" t={t} />
      <button type="button">Elsewhere</button>
    </>,
  );
  const button = screen.getByRole("button", { name: "Actions for avi@school.test" });
  return { action, button, user: userEvent.setup() };
}

describe("RowMenu", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens on click with the row's items and focuses the first", async () => {
    const { button, user } = setup();
    expect(screen.queryByRole("menu")).toBeNull();
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Resend invitation",
      "Revoke",
    ]);
    expect(document.activeElement?.textContent).toBe("Resend invitation");
  });

  it("moves with the arrows and closes on Escape, back on the button", async () => {
    const { button, user } = setup();
    button.focus();
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement?.textContent).toBe("Revoke");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Resend invitation");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("closes on a click outside", async () => {
    const { button, user } = setup();
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("submits the item's fields and shows the result in the row", async () => {
    const { action, button, user } = setup();
    await user.click(button);
    await user.click(screen.getByRole("menuitem", { name: "Resend invitation" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const form = action.mock.calls[0]![1];
    expect(Object.fromEntries(form.entries())).toEqual({ operation: "resend", invitation: "i1" });
    expect(await screen.findByRole("status")).toHaveProperty("textContent", t.saved);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("asks before a confirmed item and sends nothing when cancelled", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { action, button, user } = setup();
    await user.click(button);
    await user.click(screen.getByRole("menuitem", { name: "Revoke" }));
    expect(confirm).toHaveBeenCalledWith("Revoke it?");
    expect(action).not.toHaveBeenCalled();
  });

  it("shows a new invitation link with Copy link", async () => {
    const { button, user } = setup({
      error: null,
      saved: true,
      link: "https://x.test/staff/accept?t=1",
    });
    await user.click(button);
    await user.click(screen.getByRole("menuitem", { name: "Resend invitation" }));
    expect(await screen.findByDisplayValue("https://x.test/staff/accept?t=1")).toBeTruthy();
    expect(screen.getByRole("button", { name: t.copyLink })).toBeTruthy();
  });
});
