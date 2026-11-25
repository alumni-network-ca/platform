// The body of a news post (POST-01, POST-02): a rich-text document in the editor's JSON shape (Tiptap/ProseMirror),
// never HTML. Only the nodes and marks below survive normalizeDoc(), which runs when a post is saved and again
// when it is shown (components/posts/RichText.tsx), so a body written straight to the database through the API
// still can't carry a script, an event handler or a javascript: link.

export type Mark =
  { type: "bold" } | { type: "italic" } | { type: "link"; attrs: { href: string } };

export type Inline = { type: "text"; text: string; marks?: Mark[] } | { type: "hardBreak" };

export type Block =
  | { type: "paragraph"; content?: Inline[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: Inline[] }
  | { type: "bulletList"; content: ListItem[] }
  | { type: "orderedList"; content: ListItem[] }
  | { type: "blockquote"; content: Block[] };

export type ListItem = { type: "listItem"; content: Block[] };

export type Doc = { type: "doc"; content: Block[] };

/** Upper bounds, so a crafted body can't make a page render forever. */
const MAX_DEPTH = 8;
const MAX_NODES = 5000;
const MAX_TEXT = 50_000;

type Raw = Record<string, unknown>;
const isObject = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const children = (node: Raw): unknown[] => (Array.isArray(node.content) ? node.content : []);

/** An address a reader may follow from a post: http(s) or mailto, nothing else. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const value = href.trim();
  if (value.length === 0 || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "mailto:") return value;
    if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password)
      return url.toString();
  } catch {
    return null;
  }
  return null;
}

/**
 * The document with everything unknown dropped: other node types, other marks, attributes, unsafe links, empty
 * lists. Null when nothing readable is left.
 */
export function normalizeDoc(input: unknown): Doc | null {
  if (!isObject(input) || input.type !== "doc") return null;
  let nodes = 0;
  let text = 0;

  const marksOf = (node: Raw): Mark[] | undefined => {
    if (!Array.isArray(node.marks)) return undefined;
    const out: Mark[] = [];
    for (const mark of node.marks) {
      if (!isObject(mark)) continue;
      if (
        (mark.type === "bold" || mark.type === "italic") &&
        !out.some((m) => m.type === mark.type)
      )
        out.push({ type: mark.type });
      if (mark.type === "link" && isObject(mark.attrs) && !out.some((m) => m.type === "link")) {
        const href = safeHref(mark.attrs.href);
        if (href) out.push({ type: "link", attrs: { href } });
      }
    }
    return out.length ? out : undefined;
  };

  const inline = (list: unknown[]): Inline[] => {
    const out: Inline[] = [];
    for (const node of list) {
      if (!isObject(node) || ++nodes > MAX_NODES) continue;
      if (node.type === "hardBreak") out.push({ type: "hardBreak" });
      if (node.type === "text" && typeof node.text === "string" && node.text.length > 0) {
        const value = node.text.slice(0, Math.max(0, MAX_TEXT - text));
        text += value.length;
        if (!value) continue;
        const marks = marksOf(node);
        out.push(marks ? { type: "text", text: value, marks } : { type: "text", text: value });
      }
    }
    return out;
  };

  const blocks = (list: unknown[], depth: number): Block[] => {
    if (depth > MAX_DEPTH) return [];
    const out: Block[] = [];
    for (const node of list) {
      if (!isObject(node) || ++nodes > MAX_NODES) continue;
      switch (node.type) {
        case "paragraph": {
          const content = inline(children(node));
          out.push(content.length ? { type: "paragraph", content } : { type: "paragraph" });
          break;
        }
        case "heading": {
          const level = isObject(node.attrs) && node.attrs.level === 3 ? 3 : 2;
          const content = inline(children(node));
          if (content.length) out.push({ type: "heading", attrs: { level }, content });
          break;
        }
        case "bulletList":
        case "orderedList": {
          const items: ListItem[] = [];
          for (const item of children(node)) {
            if (!isObject(item) || item.type !== "listItem" || ++nodes > MAX_NODES) continue;
            const content = blocks(children(item), depth + 1);
            if (content.length) items.push({ type: "listItem", content });
          }
          if (items.length) out.push({ type: node.type, content: items });
          break;
        }
        case "blockquote": {
          const content = blocks(children(node), depth + 1);
          if (content.length) out.push({ type: "blockquote", content });
          break;
        }
      }
    }
    return out;
  };

  const content = blocks(children(input), 0);
  // Trailing empty paragraphs are what an editor leaves behind; they carry nothing.
  while (content.length && content.at(-1)!.type === "paragraph" && !content.at(-1)!.content)
    content.pop();
  return content.length ? { type: "doc", content } : null;
}

/** The document's words, one block per line: for the excerpt and for "is there anything written?". */
export function docText(doc: Doc | null): string {
  if (!doc) return "";
  const lines: string[] = [];
  const walk = (list: (Block | ListItem)[]) => {
    for (const node of list) {
      if (node.type === "paragraph" || node.type === "heading") {
        lines.push((node.content ?? []).map((n) => (n.type === "text" ? n.text : " ")).join(""));
      } else {
        walk(node.content as (Block | ListItem)[]);
      }
    }
  };
  walk(doc.content);
  return lines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** A plain-text excerpt of at most `max` characters, cut at a word, for cards and the notification email. */
export function excerpt(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
