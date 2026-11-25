import { describe, expect, it } from "vitest";
import { docText, excerpt, normalizeDoc, safeHref } from "@/lib/posts/richtext";

const text = (value: string, marks?: unknown[]) => ({ type: "text", text: value, marks });
const paragraph = (...content: unknown[]) => ({ type: "paragraph", content });
const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("normalizeDoc", () => {
  it("keeps headings, paragraphs, lists, quotes, bold, italic and links", () => {
    const input = doc(
      { type: "heading", attrs: { level: 2 }, content: [text("A new lab")] },
      paragraph(text("Room for "), text("three tables", [{ type: "bold" }, { type: "italic" }])),
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [paragraph(text("Open house"))] }],
      },
      { type: "blockquote", content: [paragraph(text("Finally."))] },
      paragraph(text("Photos", [{ type: "link", attrs: { href: "https://herzliah.ca/photos" } }])),
    );
    expect(normalizeDoc(input)).toEqual(input);
  });

  it("drops scripts, images, raw HTML, unknown marks and attributes", () => {
    const clean = normalizeDoc(
      doc(
        { type: "image", attrs: { src: "https://evil.test/x.png" } },
        { type: "html", content: "<script>alert(1)</script>" },
        paragraph({
          type: "text",
          text: "hi",
          marks: [{ type: "bold", attrs: { onclick: "x" } }, { type: "code" }],
        }),
        { type: "heading", attrs: { level: 1, onmouseover: "x" }, content: [text("Title")] },
      ),
    );
    expect(clean).toEqual(
      doc(paragraph(text("hi", [{ type: "bold" }])), {
        type: "heading",
        attrs: { level: 2 },
        content: [text("Title")],
      }),
    );
  });

  it("removes javascript:, data: and credential links, keeping their text", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,x", "https://u:p@evil.test", "  "]) {
      expect(
        normalizeDoc(doc(paragraph(text("click", [{ type: "link", attrs: { href } }])))),
      ).toEqual(doc(paragraph(text("click"))));
    }
  });

  it("returns null for anything that is not a document, or an empty one", () => {
    expect(normalizeDoc(null)).toBeNull();
    expect(normalizeDoc("<p>hi</p>")).toBeNull();
    expect(normalizeDoc({ type: "paragraph" })).toBeNull();
    expect(normalizeDoc(doc(paragraph(), paragraph()))).toBeNull();
  });

  it("stops at absurd nesting instead of recursing forever", () => {
    let node: unknown = paragraph(text("deep"));
    for (let i = 0; i < 50; i++) node = { type: "blockquote", content: [node] };
    expect(() => normalizeDoc(doc(node))).not.toThrow();
  });
});

describe("safeHref", () => {
  it("allows http, https and mailto only", () => {
    expect(safeHref("https://herzliah.ca/a b")).toBe("https://herzliah.ca/a%20b");
    expect(safeHref("mailto:alumni@herzliah.ca")).toBe("mailto:alumni@herzliah.ca");
    expect(safeHref("JavaScript:alert(1)")).toBeNull();
    expect(safeHref("/relative")).toBeNull();
    expect(safeHref(42)).toBeNull();
  });
});

describe("docText and excerpt", () => {
  it("reads one line per block, lists included", () => {
    const body = normalizeDoc(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [text("Title")] },
        paragraph(text("One"), { type: "hardBreak" }, text("two")),
        {
          type: "orderedList",
          content: [{ type: "listItem", content: [paragraph(text("Item"))] }],
        },
      ),
    );
    expect(docText(body)).toBe("Title\nOne two\nItem");
  });

  it("cuts at a word with an ellipsis", () => {
    expect(excerpt("short")).toBe("short");
    const cut = excerpt("word ".repeat(100), 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut.endsWith("word…")).toBe(true);
  });
});
