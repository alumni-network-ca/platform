"use client";
import { useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { safeHref } from "@/lib/posts/richtext";
import { cn } from "@/lib/utils";
import { richTextClasses } from "./RichText";

export type EditorCopy = {
  toolbar: string;
  heading: string;
  subheading: string;
  bold: string;
  italic: string;
  bulletList: string;
  numberedList: string;
  link: string;
  removeLink: string;
  quote: string;
  linkPrompt: string;
};

/**
 * The news editor (POST-02, design A7.2): headings, bold, italic, lists, links and quotes, nothing else. The editor
 * only knows those nodes, so pasted styles, images and scripts never enter the document; the server normalizes the
 * JSON again on save (lib/posts/richtext.ts). The document travels in a hidden field named `name`.
 */
export function PostEditor({
  name,
  initial,
  labelledBy,
  describedBy,
  invalid,
  t,
}: {
  name: string;
  initial: unknown;
  labelledBy: string;
  describedBy?: string;
  invalid?: boolean;
  t: EditorCopy;
}) {
  const [json, setJson] = useState(() => (initial ? JSON.stringify(initial) : ""));
  const editor = useEditor({
    // Rendered on the client only: the server can't measure the editor, and a mismatch would break hydration.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["https", "http", "mailto"],
          isAllowedUri: (url) => safeHref(url) !== null,
        },
      }),
    ],
    content: (initial as object | null) ?? "",
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: cn(richTextClasses, "min-h-64 px-4.5 py-4 outline-none"),
      },
    },
    onUpdate: ({ editor }) => setJson(editor.isEmpty ? "" : JSON.stringify(editor.getJSON())),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            h2: editor.isActive("heading", { level: 2 }),
            h3: editor.isActive("heading", { level: 3 }),
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            link: editor.isActive("link"),
          }
        : null,
  });

  const run = (command: (chain: NonNullable<typeof editor>) => void) => () => {
    if (editor) command(editor);
  };
  const setLink = () => {
    if (!editor) return;
    const current = editor.getAttributes("link").href as string | undefined;
    const answer = window.prompt(t.linkPrompt, current ?? "https://");
    if (answer === null) return;
    const href = safeHref(answer);
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  const tools: { label: string; icon: LucideIcon; on?: boolean; action: () => void }[] = [
    {
      label: t.heading,
      icon: Heading2,
      on: active?.h2,
      action: run((e) => e.chain().focus().toggleHeading({ level: 2 }).run()),
    },
    {
      label: t.subheading,
      icon: Heading3,
      on: active?.h3,
      action: run((e) => e.chain().focus().toggleHeading({ level: 3 }).run()),
    },
    {
      label: t.bold,
      icon: Bold,
      on: active?.bold,
      action: run((e) => e.chain().focus().toggleBold().run()),
    },
    {
      label: t.italic,
      icon: Italic,
      on: active?.italic,
      action: run((e) => e.chain().focus().toggleItalic().run()),
    },
    {
      label: t.bulletList,
      icon: List,
      on: active?.bullet,
      action: run((e) => e.chain().focus().toggleBulletList().run()),
    },
    {
      label: t.numberedList,
      icon: ListOrdered,
      on: active?.ordered,
      action: run((e) => e.chain().focus().toggleOrderedList().run()),
    },
    {
      label: t.quote,
      icon: Quote,
      on: active?.quote,
      action: run((e) => e.chain().focus().toggleBlockquote().run()),
    },
    { label: t.link, icon: Link2, on: active?.link, action: setLink },
    {
      label: t.removeLink,
      icon: Link2Off,
      action: run((e) => e.chain().focus().extendMarkRange("link").unsetLink().run()),
    },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-card focus-within:ring-[3px] focus-within:ring-ring/45",
        invalid && "border-destructive",
      )}
    >
      <div
        role="toolbar"
        aria-label={t.toolbar}
        className="flex flex-wrap gap-0.5 border-b bg-background p-1.5"
      >
        {tools.map(({ label, icon: Icon, on, action }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={on === undefined ? undefined : on}
            disabled={!editor}
            // Keep the editor's focus and selection: a click that moved focus to the button would drop the
            // pending mark (bold before typing) and the caret's place.
            onMouseDown={(e) => e.preventDefault()}
            onClick={action}
            className="grid size-9 cursor-pointer place-items-center rounded-sm text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 aria-pressed:bg-primary-soft aria-pressed:text-primary"
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
