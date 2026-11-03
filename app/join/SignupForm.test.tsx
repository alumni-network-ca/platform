import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SignupForm } from "./SignupForm";

const mocks = vi.hoisted(() => ({ createAccount: vi.fn(), locale: "en" }));
vi.mock("./signup-actions", () => ({
  createAccount: mocks.createAccount,
  resendConfirmation: vi.fn(),
}));
vi.mock("@/components/LanguageProvider", () => ({
  useLanguage: () => ({ locale: mocks.locale }),
}));

beforeEach(() => {
  mocks.locale = "en";
  mocks.createAccount.mockReset();
});

it.each([
  ["en", "Check your inbox", "Please check your inbox and click the link to continue."],
  [
    "fr",
    "Vérifiez votre boîte de réception",
    "Consultez votre boîte de réception et cliquez sur le lien pour continuer.",
  ],
])("shows confirmation instructions after signup in %s", async (locale, heading, message) => {
  mocks.locale = locale;
  mocks.createAccount.mockResolvedValue({ error: null, confirmationSent: true });
  const { container } = render(
    <SignupForm shortName="Herzliah" expired={false} destination="/join" />,
  );
  fireEvent.submit(container.querySelector("form")!);
  expect(await screen.findByRole("heading", { name: heading })).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent(message);
  expect(container.querySelector('input[type="password"]')).toBeNull();
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/login");
});

it("keeps the signup form when sending fails", async () => {
  mocks.createAccount.mockResolvedValue({ error: "tooMany" });
  const { container } = render(
    <SignupForm shortName="Herzliah" expired={false} destination="/join" />,
  );
  fireEvent.submit(container.querySelector("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts.");
  expect(screen.queryByRole("heading", { name: "Check your inbox" })).toBeNull();
  expect(screen.getByRole("button", { name: "Create my account" })).toBeEnabled();
});
