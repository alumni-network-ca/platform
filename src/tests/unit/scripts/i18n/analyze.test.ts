// @vitest-environment node
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { analyze } from "../../../../../scripts/i18n/analyze";
import { checkBaseline, summarize } from "../../../../../scripts/i18n/baseline";

function scan(code: string) {
  const filename = "app/example.tsx";
  const source = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const host = ts.createCompilerHost({});
  host.getSourceFile = (name) => (name === filename ? source : undefined);
  const program = ts.createProgram(
    [filename],
    { noLib: true, noResolve: true, jsx: ts.JsxEmit.Preserve },
    host,
  );
  return analyze(source, program.getTypeChecker());
}

describe("UI translation audit", () => {
  it("finds JSX copy, accessible names, custom labels, templates, and expression branches", () => {
    const result = scan(`const ui = <>
      <h1>Hello alumni</h1>
      <input placeholder="Search people" aria-label={busy ? "Wait" : "Search"} />
      <img alt="School logo" />
      <ActionForm label="Save changes" confirm="Are you sure?" />
      <p>{ready && "Ready"}{name ?? "Unknown"}{'Welcome ' + name}</p>
      <p>{\`Class of \${year}\`}</p>
      <input type="submit" value="Continue" />
      <option value="engineering">Engineering</option>
    </>`);
    expect(result.map((finding) => finding.text)).toEqual([
      "Hello alumni",
      "Search people",
      "Wait",
      "Search",
      "School logo",
      "Save changes",
      "Are you sure?",
      "Ready",
      "Unknown",
      "Welcome",
      "`Class of ${year}`",
      "Continue",
      "Engineering",
    ]);
    expect(result[0]).toMatchObject({ file: "app/example.tsx", line: 2, rule: "ui-literal" });
  });

  it("ignores technical attributes, conditions, keys, dynamic data, and punctuation", () => {
    expect(
      scan(`const ui = <Link href="/directory" className="btn" data-testid="next" role="button">
      {status === "active" ? t.active : t.pending}{format(t.classOf, { year })}
      {profile.name} · 2026 &nbsp; →
      <input name="email" type="email" autoComplete="email" value="en" />
    </Link>`),
    ).toEqual([]);
  });

  it("follows same-file constants and property initializers without looping on cycles", () => {
    const result = scan(`const label = "Continue"; const copy = { title: "Welcome" };
      const a = b; const b = a; const ui = <><button>{label}</button><h1>{copy.title}</h1><p>{a}</p></>`);
    expect(result.map((finding) => finding.text)).toEqual(["Continue", "Welcome"]);
  });

  it("checks native dialogs and common error setters", () => {
    expect(
      scan(`window.alert("Failed"); window.confirm("Delete?"); setError("Try again");
      setMessage(t.saved); setMessage(""); console.log("debug");`).map((finding) => finding.text),
    ).toEqual(["Failed", "Delete?", "Try again"]);
  });

  it("validates shared and component-local dictionaries, including function templates", () => {
    expect(
      scan(`const TEXT = {
      en: { title: "Hello {name}", nested: { save: "Save" }, sent: (email: string) => \`Sent to \${email}\` },
      fr: { title: "Bonjour {name}", nested: { save: "Enregistrer" }, sent: (email: string) => \`Envoyé à \${email}\` }
    } as const; const ui = <h1>{TEXT[locale].title}</h1>`),
    ).toEqual([]);
  });

  it("rejects missing locale, missing nested key, empty text, and mismatched placeholders", () => {
    expect(scan(`const copy = { en: { save: "Save" } };`).map((finding) => finding.rule)).toEqual([
      "catalog-keys",
    ]);
    const result = scan(`const copy = {
      en: { nested: { save: "Save" }, title: "Hello {name}", empty: "Yes", sent: (name: string) => \`To \${name}\` },
      fr: { nested: {}, title: "Bonjour {other}", empty: "  ", sent: (name: string) => "Envoyé" }
    };`);
    expect(result.map((finding) => finding.rule)).toEqual([
      "catalog-keys",
      "catalog-placeholders",
      "catalog-empty",
      "catalog-placeholders",
    ]);
  });

  it("supports locale conditionals but rejects missing translations in them", () => {
    expect(
      scan(`const text = locale === "fr" ? { title: "Bonjour" } : { title: "Hello" };
      const ui = <p>{locale === "fr" ? "Bonjour" : "Hello"}</p>`),
    ).toEqual([]);
    expect(
      scan(`const ui = <p>{locale === "fr" ? "" : "Hello"}</p>`).map((finding) => finding.rule),
    ).toEqual(["catalog-empty"]);
    expect(
      scan(`const text = locale === "fr" ? { title: "Bonjour" } : {};`).map(
        (finding) => finding.rule,
      ),
    ).toEqual(["catalog-keys"]);
  });

  it("detects mismatched object/string translation shapes", () => {
    expect(
      scan(`const copy = { en: { title: "Hello" }, fr: "Bonjour" };`).map(
        (finding) => finding.rule,
      ),
    ).toEqual(["catalog-shape"]);
  });

  it("recognizes reversed locale comparisons and boolean aliases", () => {
    expect(
      scan(`const fr = (await getServerLocale()) === "fr";
      const ui = <><p>{fr ? "Bonjour" : "Hello"}</p>
      <p>{"fr" === locale ? "Bonjour {name}" : "Hello {name}"}</p></>`),
    ).toEqual([]);
    expect(
      scan(`const french = locale !== "en";
      const copy = french ? { title: "Bonjour" } : {};`).map((finding) => finding.rule),
    ).toEqual(["catalog-keys"]);
  });

  it("rejects empty function translations and opaque dictionary spreads", () => {
    expect(
      scan(`const copy = { en: { title: () => "Hello" }, fr: { title: () => "" } };`).map(
        (finding) => finding.rule,
      ),
    ).toEqual(["catalog-empty"]);
    expect(
      scan(`const copy = { en: { ...base }, fr: { ...base } };`).map((finding) => finding.rule),
    ).toEqual(["catalog-value", "catalog-value"]);
  });

  it("does not let a wrong placeholder pass through reversed locale comparisons", () => {
    expect(
      scan(`const ui = <p>{"fr" === locale ? "Bonjour {nom}" : "Hello {name}"}</p>`).map(
        (finding) => finding.rule,
      ),
    ).toEqual(["catalog-placeholders"]);
  });

  it("supports concatenated translations and compares their dynamic values", () => {
    expect(
      scan(`const fr = locale === "fr";
      const copy = fr ? { title: school + " : bienvenue", body: "Bonjour " + name + "." }
        : { title: "Welcome to " + school, body: "Hello " + name + "." };`),
    ).toEqual([]);
    expect(
      scan(`const copy = {
      en: { title: "Hello " + name }, fr: { title: "Bonjour " + school }
    };`).map((finding) => finding.rule),
    ).toEqual(["catalog-placeholders"]);
  });
});

describe("translation debt baseline", () => {
  const existing = scan(`const ui = <p>Hello</p>`);

  it("is stable when line numbers move", () => {
    expect(checkBaseline(scan(`\n\nconst ui = <p>Hello</p>`), summarize(existing))).toEqual({
      added: [],
      stale: [],
    });
  });

  it("fails for new, changed, moved, or duplicated copy", () => {
    const baseline = summarize(existing);
    for (const code of [`const ui = <p>Hi</p>`, `const ui = <><p>Hello</p><p>Hello</p></>`]) {
      expect(checkBaseline(scan(code), baseline).added).toHaveLength(1);
    }
    expect(
      checkBaseline(
        existing.map((finding) => ({ ...finding, file: "app/new.tsx" })),
        baseline,
      ).added,
    ).toHaveLength(1);
  });

  it("requires resolved entries to be removed and never exempts dictionary errors", () => {
    expect(checkBaseline([], summarize(existing)).stale).toHaveLength(1);
    const errors = scan(`const copy = { en: { title: "Hello" } };`);
    expect(checkBaseline(errors, summarize(errors)).added).toHaveLength(1);
  });
});
