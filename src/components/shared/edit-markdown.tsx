"use client";

import { Children, isValidElement, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { inlineWordDiff, MARK_ADDED, MARK_END, MARK_REMOVED } from "@/lib/word-diff";

/*
 * Markdown from a suggested edit, with its text highlighted like a
 * highlighter pen: green for new text, red for removed.
 * The highlight wraps line by line, with the gaps between lines left
 * clear, rather than filling the whole block.
 *
 * It works by wrapping the text inside each paragraph, heading, list item
 * and table cell in a span; nested lists and other blocks are left out,
 * so they get their own spans.
 *
 * A rewrite can instead be shown word by word (`words`): one block with
 * marks around its removed and new words (see word-diff), highlighted
 * where they are.
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

// The parsed document, as much of it as the word marks need.
type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const MARK_OF: Record<string, EditMark> = { [MARK_ADDED]: "added", [MARK_REMOVED]: "removed" };
const SPLIT_MARKS = new RegExp(`([${MARK_ADDED}${MARK_REMOVED}${MARK_END}])`);

/**
 * Turns word marks into highlights. Walks the text in reading order, so a
 * mark can open in one element and close in another (around bold text,
 * say): each piece of text inside it is highlighted on its own.
 */
function rehypeWordMarks(onBrand: boolean) {
  return () => (tree: HastNode) => {
    let open: EditMark | null = null;
    const walk = (node: HastNode) => {
      if (!node.children) return;
      const children: HastNode[] = [];
      for (const child of node.children) {
        if (child.type !== "text") {
          walk(child);
          children.push(child);
          continue;
        }
        for (const part of (child.value ?? "").split(SPLIT_MARKS)) {
          if (part === MARK_END) open = null;
          else if (part in MARK_OF) open = MARK_OF[part];
          else if (part && open) {
            const className = cn("rounded-[3px] [box-decoration-break:clone]", MARK[open][onBrand ? "onBrand" : "plain"]);
            children.push({ type: "element", tagName: "span", properties: { className: className.split(" ") }, children: [{ type: "text", value: part }] });
          } else if (part) children.push({ type: "text", value: part });
        }
      }
      node.children = children;
    };
    walk(tree);
  };
}

const WORD_MARKS = { plain: rehypeWordMarks(false), onBrand: rehypeWordMarks(true) };

const COMPONENTS = {
  added: { plain: markComponents(MARK.added.plain), onBrand: markComponents(MARK.added.onBrand) },
  removed: { plain: markComponents(MARK.removed.plain), onBrand: markComponents(MARK.removed.onBrand) },
};

/**
 * Renders markdown, highlighted as added or removed text when `mark` is
 * set, or word by word when it's "words" (markdown from inlineWordDiff).
 * `onBrand` for the blue canvas nodes.
 */
export function EditMarkdown({
  markdown,
  mark,
  onBrand = false,
}: {
  markdown: string;
  mark?: EditMark | "words";
  onBrand?: boolean;
}) {
  const tone = onBrand ? "onBrand" : "plain";
  return (
    // Default escapes raw HTML: never add rehype-raw without rehype-sanitize.
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={mark === "words" ? [WORD_MARKS[tone]] : undefined}
      components={mark && mark !== "words" ? COMPONENTS[mark][tone] : undefined}
    >
      {markdown}
    </Markdown>
  );
}

/**
 * One block of a document with a suggested edit in it: as it is, new
 * (green), going (red), or rewritten. A small rewrite shows word by word,
 * in place; a bigger one shows the old version in red, then the new in
 * green. A change left out (`skipped`) shows the document as it is now; a
 * left-out addition stays, faded, so you can see what you skipped.
 */
export function EditedBlock({
  block,
  skipped = false,
  onBrand = false,
}: {
  block: { kind: "same" | "added" | "removed" | "rewritten"; markdown: string; before?: string };
  skipped?: boolean;
  onBrand?: boolean;
}) {
  if (block.kind === "same") return <EditMarkdown markdown={block.markdown} onBrand={onBrand} />;
  if (skipped) {
    if (block.kind === "added") {
      return (
        <div className="opacity-40">
          <EditMarkdown markdown={block.markdown} onBrand={onBrand} />
        </div>
      );
    }
    return <EditMarkdown markdown={block.before ?? block.markdown} onBrand={onBrand} />;
  }
  if (block.kind !== "rewritten" || block.before === undefined) {
    return <EditMarkdown markdown={block.markdown} mark={block.kind === "removed" ? "removed" : "added"} onBrand={onBrand} />;
  }
  const words = inlineWordDiff(block.before, block.markdown);
  if (words !== null) return <EditMarkdown markdown={words} mark="words" onBrand={onBrand} />;
  return (
    <>
      <EditMarkdown markdown={block.before} mark="removed" onBrand={onBrand} />
      <EditMarkdown markdown={block.markdown} mark="added" onBrand={onBrand} />
    </>
  );
}
