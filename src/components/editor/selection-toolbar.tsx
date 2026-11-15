"use client";

import { useState } from "react";
import { type Editor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Code, Italic, Link2, Strikethrough } from "lucide-react";
import { cn } from "@/lib/utils";

/** A small floating bar over selected text: bold, italic, strike, code, link. */
export function SelectionToolbar({ editor }: { editor: Editor }) {
  const [linkDraft, setLinkDraft] = useState<string | null>(null);

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      link: editor.isActive("link"),
    }),
  });

  const run = (command: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) =>
    command(editor.chain().focus()).run();

  const onLink = () => {
    if (active.link) {
      run((c) => c.extendMarkRange("link").unsetLink());
    } else {
      setLinkDraft("");
    }
  };

  const applyLink = () => {
    const href = linkDraft?.trim();
    if (href) run((c) => c.extendMarkRange("link").setLink({ href }));
    setLinkDraft(null);
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 6 }}
      className="flex items-center gap-0.5 rounded-xl bg-surface-modal p-1 text-fg-secondary shadow-large"
    >
      {linkDraft === null ? (
        <>
          <ToolButton label="Bold" active={active.bold} onClick={() => run((c) => c.toggleBold())}>
            <Bold />
          </ToolButton>
          <ToolButton label="Italic" active={active.italic} onClick={() => run((c) => c.toggleItalic())}>
            <Italic />
          </ToolButton>
          <ToolButton label="Strikethrough" active={active.strike} onClick={() => run((c) => c.toggleStrike())}>
            <Strikethrough />
          </ToolButton>
          <ToolButton label="Code" active={active.code} onClick={() => run((c) => c.toggleCode())}>
            <Code />
          </ToolButton>
          <ToolButton label={active.link ? "Remove link" : "Link"} active={active.link} onClick={onLink}>
            <Link2 />
          </ToolButton>
        </>
      ) : (
        <input
          autoFocus
          type="url"
          value={linkDraft}
          placeholder="Paste a link…"
          onChange={(e) => setLinkDraft(e.target.value)}
          onBlur={() => setLinkDraft(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            }
            if (e.key === "Escape") setLinkDraft(null);
          }}
          className="h-7 w-56 bg-transparent px-2 text-body-sm text-fg-primary outline-none placeholder:text-fg-tertiary"
        />
      )}
    </BubbleMenu>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      // Keep the selection: don't let the button take focus on press.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-7 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5",
        active && "bg-transparent-hover text-fg-primary",
      )}
    >
      {children}
    </button>
  );
}
