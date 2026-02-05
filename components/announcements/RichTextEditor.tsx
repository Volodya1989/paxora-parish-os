"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useCallback, useEffect } from "react";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
     immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: {},
        orderedList: {},
        listItem: {}
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }
      }),
      Underline
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[160px] px-3 py-2 focus:outline-none text-ink-900 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_a]:text-primary-600 [&_a]:underline"
      }
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML(), ed.getText());
    }
  });

  useEffect(() => {
    if (editor && content && !editor.getText().trim()) {
      editor.commands.setContent(content);
    }
    // Only run on initial mount when content prop changes from empty to filled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter URL:");
    if (!url) return;

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${normalizedUrl}">${normalizedUrl}</a>`)
        .run();
    } else {
      editor.chain().focus().setLink({ href: normalizedUrl }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-card border border-mist-200 bg-white focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:border-primary-400">
      <div className="flex flex-wrap items-center gap-1 border-b border-mist-100 px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          label="Underline"
        >
          <span className="underline">U</span>
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-mist-200" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          label="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          label="Heading 3"
        >
          H3
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-mist-200" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Bullet list"
        >
          &bull;
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Numbered list"
        >
          1.
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-mist-200" />

        <ToolbarButton
          onClick={addLink}
          active={editor.isActive("link")}
          label="Link"
        >
          <span className="underline">Link</span>
        </ToolbarButton>
        {editor.isActive("link") ? (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            active={false}
            label="Remove link"
          >
            Unlink
          </ToolbarButton>
        ) : null}
      </div>
      <EditorContent editor={editor} />
      {!editor.getText().trim() && placeholder ? (
        <div className="pointer-events-none absolute px-3 py-2 text-sm text-ink-400">
          {/* placeholder handled by TipTap placeholder or CSS */}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  children
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs font-medium transition ${
        active
          ? "bg-primary-100 text-primary-700"
          : "text-ink-500 hover:bg-mist-100 hover:text-ink-700"
      }`}
    >
      {children}
    </button>
  );
}
