import { describe, expect, it } from "vitest";
import { escapeHtml, linkifyText } from "./html";

describe("escapeHtml", () => {
  it("escapes every character that could open a tag or leave an attribute", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});

describe("linkifyText", () => {
  const links = new Set(["https://a.test/login"]);

  it("links only the trusted addresses, outside a sentence's final period", () => {
    expect(linkifyText("Go to https://a.test/login. Not https://evil.test", links, "#0B2159")).toBe(
      'Go to <a href="https://a.test/login" style="color:#0B2159;word-break:break-all;">https://a.test/login</a>. Not https://evil.test',
    );
  });

  it("escapes the text around links and keeps line breaks", () => {
    expect(linkifyText("a <b>\nc", links, "#000000")).toBe("a &lt;b&gt;<br>c");
  });

  it("works the same on every call (the shared pattern keeps no state)", () => {
    const once = linkifyText("https://a.test/login", links, "#000000");
    expect(linkifyText("https://a.test/login", links, "#000000")).toBe(once);
  });
});
