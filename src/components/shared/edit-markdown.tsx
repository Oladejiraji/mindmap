"use client";

import { Children, isValidElement, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/*
 * Markdown from a suggested edit, with its text highlighted like a
 * highlighter pen: green for new text, red for removed.
 * The highlight wraps line by line, with the gaps between lines left
 * clear, rather than filling the whole block.
 *
 * It works by wrapping the text inside each paragraph, heading, list item
 * and table cell in a span; nested lists and other blocks are left out,
 * so they get their own spans.
 */

export type EditMark = "added" | "removed";

const MARK: Record<EditMark, { plain: string; onBrand: string }> = {
  added: { plain: "bg-positive-solid/18", onBrand: "bg-positive-solid/55" },
  removed: { plain: "bg-danger-solid/12 text-fg-secondary", onBrand: "bg-danger-solid/50" },
};

// Blocks inside a list item that get their own highlight, not the item's.
const BLOCKS = new Set(["ul", "ol", "pre", "blockquote", "table", "div", "hr"]);

function isBlock(child: ReactNode) {
  if (!isValidElement(child)) return false;
  // Our own paragraph and heading components (functions) wrap themselves.
  return typeof child.type !== "string" || BLOCKS.has(child.type);
}

/** Wraps each run of inline content in a highlight, leaving blocks alone. */
function highlight(children: ReactNode, className: string) {
  const out: ReactNode[] = [];
  let run: ReactNode[] = [];
  const flush = () => {
    // Whitespace between blocks shouldn't become a blob of colour.
    const text = run.some((c) => typeof c !== "string" || c.trim() !== "");
    if (text) {
      out.push(
        <span key={out.length} className={cn("rounded-[3px] [box-decoration-break:clone]", className)}>
          {run}
        </span>,
      );
    } else out.push(...run);
    run = [];
  };
  Children.forEach(children, (child) => {
    if (isBlock(child)) {
      flush();
      out.push(child);
    } else run.push(child);
  });
  flush();
  return out;
}

type Tag = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "li" | "td" | "th";

function markComponents(className: string): Components {
  const wrap = (Tag: Tag) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function Highlighted({ node, children, ...props }: { node?: unknown; children?: ReactNode }) {
      return <Tag {...props}>{highlight(children, className)}</Tag>;
    }
    return Highlighted;
  };
  // A code block is one box anyway: tint it whole.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function TintedPre({ node, className: own, ...props }: React.ComponentProps<"pre"> & { node?: unknown }) {
    return <pre {...props} className={cn(own, className)} />;
  }
  return {
    p: wrap("p"),
    h1: wrap("h1"),
    h2: wrap("h2"),
    h3: wrap("h3"),
    h4: wrap("h4"),
    h5: wrap("h5"),
    h6: wrap("h6"),
    li: wrap("li"),
    td: wrap("td"),
    th: wrap("th"),
    pre: TintedPre,
  };
}

const COMPONENTS = {
  added: { plain: markComponents(MARK.added.plain), onBrand: markComponents(MARK.added.onBrand) },
  removed: { plain: markComponents(MARK.removed.plain), onBrand: markComponents(MARK.removed.onBrand) },
};

/**
 * Renders markdown, highlighted as added or removed text when `mark` is
 * set. `onBrand` for the blue canvas nodes.
 */
export function EditMarkdown({
  markdown,
  mark,
  onBrand = false,
}: {
  markdown: string;
  mark?: EditMark;
  onBrand?: boolean;
}) {
  return (
    // Default escapes raw HTML: never add rehype-raw without rehype-sanitize.
    <Markdown remarkPlugins={[remarkGfm]} components={mark ? COMPONENTS[mark][onBrand ? "onBrand" : "plain"] : undefined}>
      {markdown}
    </Markdown>
  );
}
