import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NavAccount } from "@/lib/auth/nav";
import { AccountMenu } from "./AccountMenu";

let pathname = "/directory";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const account: NavAccount = {
  name: "Dana Levy",
  email: "dana.levy@example.test",
  initials: "DL",
  avatar: "alumni",
  status: { text: "Class of 2014 · Verified graduate", tone: "good" },
  buttonLabel: "Account menu for Dana Levy",
  menuLabel: "Account",
  sections: [
    {
      key: "profile",
      items: [
        { key: "myProfile", label: "My profile", href: "/me" },
        { key: "privacy", label: "Privacy policy and terms", href: "#" },
      ],
    },
    {
      key: "account",
      title: "Account",
      items: [
        {
          key: "language",
          label: "Language",
          action: "language",
          chip: { text: "English · Français", kind: "info" },
        },
      ],
    },
    {
      key: "signOut",
      items: [{ key: "signOut", label: "Sign out", action: "signOut", danger: true }],
    },
  ],
};

function setup() {
  const onAction = vi.fn();
  const view = render(
    <>
      <AccountMenu account={account} platform={false} onAction={onAction} />
      <button type="button">Elsewhere</button>
    </>,
  );
  const button = screen.getByRole("button", { name: "Account menu for Dana Levy" });
  return { ...view, onAction, button, user: userEvent.setup() };
}

const items = () => screen.getAllByRole("menuitem").map((item) => item.textContent);

describe("AccountMenu", () => {
  beforeEach(() => {
    pathname = "/directory";
  });

  it("is a closed menu button until opened", () => {
    const { button } = setup();
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens on click with the first item focused, and shows who is signed in", async () => {
    const { button, user } = setup();
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", screen.getByRole("menu").id);
    expect(screen.getByRole("menu", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByText("dana.levy@example.test")).toBeInTheDocument();
    expect(screen.getByText("Class of 2014 · Verified graduate")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Account" })).toBeInTheDocument();
    expect(items()).toEqual([
      "My profile",
      "Privacy policy and terms",
      "LanguageEnglish · Français",
      "Sign out",
    ]);
    expect(screen.getByRole("menuitem", { name: "My profile" })).toHaveFocus();
  });

  it("moves with the arrows, Home and End, wrapping around", async () => {
    const { button, user } = setup();
    button.focus();
    await user.keyboard("{ArrowDown}");
    const focused = () => document.activeElement?.textContent;
    expect(focused()).toBe("My profile");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(focused()).toBe("LanguageEnglish · Français");
    await user.keyboard("{End}");
    expect(focused()).toBe("Sign out");
    await user.keyboard("{ArrowDown}");
    expect(focused()).toBe("My profile");
    await user.keyboard("{ArrowUp}");
    expect(focused()).toBe("Sign out");
    await user.keyboard("{Home}");
    expect(focused()).toBe("My profile");
  });

  it("opens on the last item with ArrowUp", async () => {
    const { button, user } = setup();
    button.focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the button", async () => {
    const { button, user } = setup();
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a click outside and on Tab", async () => {
    const { button, user } = setup();
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(button);
    await user.keyboard("{Tab}");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("runs an action item, closes and returns focus", async () => {
    const { button, user, onAction } = setup();
    await user.click(button);
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onAction).toHaveBeenCalledWith("signOut");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("closes when the page changes", async () => {
    const { button, user, rerender, onAction } = setup();
    await user.click(button);
    pathname = "/me";
    act(() =>
      rerender(
        <>
          <AccountMenu account={account} platform={false} onAction={onAction} />
          <button type="button">Elsewhere</button>
        </>,
      ),
    );
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes when the button is clicked again", async () => {
    const { button, user } = setup();
    await user.click(button);
    fireEvent.click(button);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
