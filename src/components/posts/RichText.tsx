import { Fragment, type ReactNode } from "react";
import { normalizeDoc, type Block, type Inline } from "@/lib/posts/richtext";
import { cn } from "@/lib/utils";

/** How a news body looks, in the editor and on the page alike, so what an admin writes is what alumni read. */
export const richTextClasses = cn(
  "flex flex-col gap-3.5 text-md leading-relaxed text-foreground",
  "[&_h2]:mt-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-1 [&_h3]:text-lg [&_h3]:font-bold",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_li>p]:m-0",
  "[&_blockquote]:border-l-3 [&_blockquote]:border-pink [&_blockquote]:pl-4 [&_blockquote]:text-subtle-foreground",
  "[&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-bold",
);

function inline(nodes: Inline[] | undefined): ReactNode {
  return (nodes ?? []).map((node, i) => {
    if (node.type === "hardBreak") return <br key={i} />;
    let out: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") out = <strong>{out}</strong>;
      if (mark.type === "italic") out = <em>{out}</em>;
      if (mark.type === "link")
        out = (
          <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer nofollow">
            {out}
          </a>
        );
    }
    return <Fragment key={i}>{out}</Fragment>;
  });
}

function blocks(nodes: Block[]): ReactNode {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "paragraph":
        return <p key={i}>{inline(node.content)}</p>;
      case "heading":
        return node.attrs.level === 3 ? (
          <h3 key={i}>{inline(node.content)}</h3>
        ) : (
          <h2 key={i}>{inline(node.content)}</h2>
        );
      case "bulletList":
      case "orderedList": {
        const List = node.type === "bulletList" ? "ul" : "ol";
        return (
          <List key={i}>
            {node.content.map((item, j) => (
              <li key={j}>{blocks(item.content)}</li>
            ))}
          </List>
        );
      }
      case "blockquote":
        return <blockquote key={i}>{blocks(node.content)}</blockquote>;
    }
  });
}

/**
 * A news post's body. The stored document goes through the allow-list again here, so whatever reached the
 * database, only headings, paragraphs, lists, quotes, bold, italic and http(s)/mailto links are drawn, all as React
 * elements (never as HTML).
 */
export function RichText({ doc, className }: { doc: unknown; className?: string }) {
  const clean = normalizeDoc(doc);
  if (!clean) return null;
  return <div className={cn(richTextClasses, className)}>{blocks(clean.content)}</div>;
}
