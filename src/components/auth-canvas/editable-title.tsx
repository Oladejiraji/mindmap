"use client";

import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

export function EditableTitle({
  initial,
  className,
}: {
  initial: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);

  function handleDoubleClick() {
    setEditing(true);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLParagraphElement>) {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      ref.current?.blur();
    }
  }

  function handleBlur(e: FocusEvent<HTMLParagraphElement>) {
    const next = e.currentTarget.textContent?.trim();
    if (next && next.length > 0) {
      setValue(next);
    } else {
      e.currentTarget.textContent = value;
    }
    setEditing(false);
  }

  return (
    <p
      ref={ref}
      className={className}
      contentEditable={editing}
      suppressContentEditableWarning
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        outline: "none",
        cursor: editing ? "text" : undefined,
        whiteSpace: "pre",
        boxShadow: editing
          ? "0 0 0 1px color-mix(in srgb, currentColor 50%, transparent)"
          : undefined,
        borderRadius: editing ? 4 : undefined,
        paddingInline: editing ? 4 : undefined,
        marginInline: editing ? -4 : undefined,
        paddingBlock: editing ? 3 : undefined,
        marginBlock: editing ? -3 : undefined,
        lineHeight: editing ? 1 : undefined,
      }}
    >
      {value}
    </p>
  );
}
