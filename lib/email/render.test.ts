import { describe, expect, it } from "vitest";
import type { EmailBrand } from "@/types/email";
import { fillPlaceholders, renderEmail } from "./render";

const brand: EmailBrand = {
  networkName: "Herzliah Alumni Network",
  logoUrl: "http://herzliah.localhost:3000/herzliah-logo.png",
  primaryColor: "#0B3D91",
  locale: "en",
};

describe("fillPlaceholders", () => {
  it("fills every placeholder and leaves no raw braces for missing values", () => {
    expect(fillPlaceholders("Hi {first_name}, {reason}!", { first_name: "Ari" })).toBe("Hi Ari, !");
  });

  it("collapses the blank lines a missing paragraph leaves behind", () => {
    expect(fillPlaceholders("Hi\n\n{reason}\n\nBye", {})).toBe("Hi\n\nBye");
  });
});

describe("renderEmail", () => {
  const template = {
    subject: "Welcome to the {school_name} Alumni Network",
    body: "Hi {first_name},\n\nYour request was approved. Sign in:\n\n{sign_in_link}",
  };
  const values = {
    first_name: "Ari",
    school_name: "Herzliah",
    sign_in_link: "http://herzliah.localhost:3000/login",
  };

  it("builds the subject and the plain-text part", () => {
    const email = renderEmail(template, values, brand);
    expect(email.subject).toBe("Welcome to the Herzliah Alumni Network");
    expect(email.text).toBe(
      "Hi Ari,\n\nYour request was approved. Sign in:\n\nhttp://herzliah.localhost:3000/login",
    );
  });

  it("wraps the text in the school's branded layout, with clickable links", () => {
    const { html } = renderEmail(template, values, brand);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('src="http://herzliah.localhost:3000/herzliah-logo.png"');
    expect(html).toContain("border-top:4px solid #0B3D91");
    expect(html).toContain(
      '<a href="http://herzliah.localhost:3000/login" style="color:#0B3D91;word-break:break-all;">',
    );
  });

  it("escapes what people typed, so a reason can't inject HTML", () => {
    const { html } = renderEmail(
      { subject: "Re: {first_name}", body: "{reason}" },
      { first_name: "Ari", reason: '<script>alert("x")</script> & co' },
      brand,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co");
  });

  it("keeps a sentence's final period out of the link", () => {
    const { html } = renderEmail(
      { subject: "s", body: "Go to {sign_in_link}." },
      { sign_in_link: "https://a.test/login" },
      brand,
    );
    expect(html).toContain('href="https://a.test/login"');
    expect(html).toContain("</a>.");
  });

  it("links only the app's own addresses, never one a person typed", () => {
    const { html } = renderEmail(
      { subject: "s", body: "Hi {first_name}. {reason} {sign_in_link}" },
      {
        first_name: "https://evil.example",
        reason: "See https://other.example/x",
        sign_in_link: "https://herzliah.alumninetwork.ca/login",
      },
      brand,
    );
    expect(html).toContain('href="https://herzliah.alumninetwork.ca/login"');
    expect(html).not.toContain('href="https://evil.example"');
    expect(html).not.toContain('href="https://other.example/x"');
    expect(html).toContain("Hi https://evil.example.");
  });

  it("keeps the subject on one line", () => {
    const { subject } = renderEmail(
      { subject: "Hi {first_name}", body: "b" },
      { first_name: "A\nBcc: x" },
      brand,
    );
    expect(subject).toBe("Hi A Bcc: x");
  });

  it("uses the French footer and shows the name when there is no logo", () => {
    const { html } = renderEmail(template, values, { ...brand, locale: "fr", logoUrl: null });
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain("Vous recevez ce courriel");
    expect(html).toContain(">Herzliah Alumni Network</span>");
  });
});
