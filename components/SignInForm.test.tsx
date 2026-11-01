import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignInForm } from "./SignInForm";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./LanguageProvider", () => ({ useLanguage: () => ({ locale: "en" }) }));

describe("SignInForm", () => {
  it("offers emailed codes when they are on", () => {
    render(<SignInForm networkName="Herzliah Alumni Network" audience="school" codes />);
    expect(screen.getByRole("button", { name: "Send me a code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with a password" })).toBeInTheDocument();
  });

  it("offers passwords only while codes are off", () => {
    render(<SignInForm networkName="Herzliah Alumni Network" audience="school" codes={false} />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /code/i })).toBeNull();
    expect(screen.getByText(/emailed code is coming soon/)).toBeInTheDocument();
  });
});
