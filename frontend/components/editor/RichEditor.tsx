"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";

import { normalizeLink } from "@/lib/editable";

import { ui } from "../styles";
import { EditorFrame } from "./EditorFrame";

type Props = { html: string; save: (html: string | undefined) => Promise<void>; saving: boolean; error?: string; onCancel: () => void };

export function RichEditor({ html, save, saving, error, onCancel }: Props) {
  const changed = useRef(false);
  const editor = useEditor({
    immediatelyRender: false, // the page is prerendered; the editor only exists in the browser
    content: html,
    onUpdate: () => {
      changed.current = true;
    },
    extensions: [
      // Only what the ADR-005 allowlist can store. trailingNode is off: it would append an empty paragraph
      // after a list, changing text the inspector didn't touch.
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        trailingNode: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } },
      }),
    ],
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Comment text",
        class: "comment-html min-h-20 px-3 py-2 text-sm leading-6 text-ink outline-hidden",
      },
    },
  });

  // Nothing is sent unless the inspector changed something; an untouched comment keeps its exact source HTML.
  const onSave = () => save(!changed.current || !editor ? undefined : editor.isEmpty ? "" : editor.getHTML());
  return (
    <EditorFrame saving={saving} error={error} onSave={onSave} onCancel={onCancel}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </EditorFrame>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      link: e.isActive("link"),
    }),
  });
  const [linking, setLinking] = useState(false);
  const [address, setAddress] = useState("");
  const chain = () => editor.chain().focus();

  function applyLink() {
    const href = normalizeLink(address);
    if (!href) return;
    if (editor.state.selection.empty && !active.link) {
      chain().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain().extendMarkRange("link").setLink({ href }).run();
    }
    setLinking(false);
  }

  return (
    <div className="border-b border-line">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-1 px-1.5 py-1.5">
        <Tool label="Bold" pressed={active.bold} onClick={() => chain().toggleBold().run()}><b>B</b></Tool>
        <Tool label="Italic" pressed={active.italic} onClick={() => chain().toggleItalic().run()}><i>I</i></Tool>
        <Tool label="Underline" pressed={active.underline} onClick={() => chain().toggleUnderline().run()}><u>U</u></Tool>
        <Tool label="Bulleted list" pressed={active.bulletList} onClick={() => chain().toggleBulletList().run()}>• List</Tool>
        <Tool label="Numbered list" pressed={active.orderedList} onClick={() => chain().toggleOrderedList().run()}>1. List</Tool>
        <Tool
          label="Link"
          pressed={active.link || linking}
          onClick={() => {
            setAddress(editor.getAttributes("link").href ?? "");
            setLinking((open) => !open);
          }}
        >
          Link
        </Tool>
      </div>
      {linking && (
        <div className="flex items-center gap-2 px-2 pb-2">
          <input
            aria-label="Link address"
            placeholder="www.example.com/article"
            value={address}
            autoFocus
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), applyLink())}
            className={`flex-1 text-xs ${ui.input}`}
          />
          <button type="button" onClick={applyLink} className={ui.smallButton}>
            Apply
          </button>
          {active.link && (
            <button
              type="button"
              onClick={() => (chain().extendMarkRange("link").unsetLink().run(), setLinking(false))}
              className={ui.smallButton}
            >
              Remove link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Toolbar buttons are tinted while their formatting is on (and say so with aria-pressed).
const TOOL = `min-w-8 rounded-md px-2 py-1 text-xs font-semibold transition-colors motion-reduce:transition-none ${ui.focus}`;

function Tool({ label, pressed, onClick, children }: { label: string; pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`${TOOL} ${pressed ? "bg-tint text-accent" : "text-ink hover:bg-page"}`}
    >
      {children}
    </button>
  );
}
