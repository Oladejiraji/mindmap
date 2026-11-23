import { Lexer } from "marked";
import { v, type Infer } from "convex/values";

/*
 * A node's document as numbered blocks, so the AI can point at the part it
 * wants to change.
 *
 * A block is one top-level markdown element: a heading, a paragraph, a whole
 * list, a table, a code block, a quote. Blocks are worked out from the
 * markdown every time, never stored. They use marked's lexer, the parser
 * Tiptap's markdown support is built on, so a block here is a block in the
 * editor.
 */

export const documentEditValidator = v.union(
  v.object({ type: v.literal("replace"), block: v.number(), markdown: v.string() }),
  /** `after: 0` inserts at the top of the document. */
  v.object({ type: v.literal("insert"), after: v.number(), markdown: v.string() }),
  v.object({ type: v.literal("delete"), block: v.number() }),
);

export type DocumentEdit = Infer<typeof documentEditValidator>;

/** One change, as the user sees it: the old block, the new markdown, or both. */
export type DocumentChange = {
  type: DocumentEdit["type"];
  before: string | null;
  after: string | null;
};

/**
 * One block of the document after the edits, for previewing them: kept as
 * it was, new, a new version of an old block, or an old block that goes.
 */
export type PreviewBlock =
  | { kind: "same" | "added"; markdown: string }
  | { kind: "rewritten"; markdown: string; before: string }
  | { kind: "removed"; markdown: string };

export class DocumentEditError extends Error {}

/** The document's top-level blocks, in order. Block n is at index n - 1. */
export function splitBlocks(markdown: string): string[] {
  if (!markdown.trim()) return [];
  return Lexer.lex(markdown, { gfm: true })
    .filter((token) => token.type !== "space")
    .map((token) => token.raw.trimEnd())
    .filter((raw) => raw.length > 0);
}

export function joinBlocks(blocks: string[]): string {
  return blocks.join("\n\n");
}

/**
 * Applies edits to a document. Block numbers always refer to the document
 * as given, not to the result of earlier edits, so the order of edits only
 * matters for inserts at the same spot. Throws DocumentEditError when an
 * edit doesn't fit the document.
 */
export function applyEdits(markdown: string, edits: DocumentEdit[]): string {
  const blocks = splitBlocks(markdown);
  const plan = planEdits(blocks, edits);

  const out = [...plan.insertsAfter[0]];
  blocks.forEach((block, i) => {
    const n = i + 1;
    const change = plan.changes.get(n);
    if (change === undefined) out.push(block);
    else if (change !== null) out.push(change);
    out.push(...plan.insertsAfter[n]);
  });
  return joinBlocks(out);
}

/**
 * The whole document after the edits, block by block, each marked with
 * what happened to it. Removed blocks stay in place, so a preview can show
 * them going. Throws DocumentEditError like applyEdits.
 */
export function previewEdits(markdown: string, edits: DocumentEdit[]): PreviewBlock[] {
  const blocks = splitBlocks(markdown);
  const plan = planEdits(blocks, edits);
  const added = (md: string): PreviewBlock => ({ kind: "added", markdown: md });

  const out: PreviewBlock[] = plan.insertsAfter[0].map(added);
  blocks.forEach((block, i) => {
    const n = i + 1;
    const change = plan.changes.get(n);
    if (change === undefined) out.push({ kind: "same", markdown: block });
    else if (change === null) out.push({ kind: "removed", markdown: block });
    else out.push({ kind: "rewritten", markdown: change, before: block });
    out.push(...plan.insertsAfter[n].map(added));
  });
  return out;
}

/** The edits as before/after pairs, in document order, for showing the user. */
export function describeEdits(markdown: string, edits: DocumentEdit[]): DocumentChange[] {
  const blocks = splitBlocks(markdown);
  planEdits(blocks, edits);
  const position = (edit: DocumentEdit) => (edit.type === "insert" ? edit.after + 0.5 : edit.block);
  return [...edits]
    .map((edit, order) => ({ edit, order }))
    .sort((a, b) => position(a.edit) - position(b.edit) || a.order - b.order)
    .map(({ edit }) => ({
      type: edit.type,
      before: edit.type === "insert" ? null : blocks[edit.block - 1],
      after: edit.type === "delete" ? null : edit.markdown.trim(),
    }));
}

function planEdits(blocks: string[], edits: DocumentEdit[]) {
  if (edits.length === 0) throw new DocumentEditError("No edits");

  const count = blocks.length;
  /** Block number → replacement markdown, or null when deleted. */
  const changes = new Map<number, string | null>();
  const insertsAfter: string[][] = Array.from({ length: count + 1 }, () => []);

  for (const edit of edits) {
    if (edit.type === "insert") {
      if (!Number.isInteger(edit.after) || edit.after < 0 || edit.after > count) {
        throw new DocumentEditError(`Can't insert after block ${edit.after}: the document has ${count} blocks`);
      }
      const markdown = edit.markdown.trim();
      if (!markdown) throw new DocumentEditError("An insert has no content");
      insertsAfter[edit.after].push(markdown);
      continue;
    }

    if (!Number.isInteger(edit.block) || edit.block < 1 || edit.block > count) {
      throw new DocumentEditError(`Block ${edit.block} doesn't exist: the document has ${count} blocks`);
    }
    if (changes.has(edit.block)) {
      throw new DocumentEditError(`Block ${edit.block} is changed more than once`);
    }
    if (edit.type === "delete") {
      changes.set(edit.block, null);
    } else {
      const markdown = edit.markdown.trim();
      if (!markdown) throw new DocumentEditError(`Replacing block ${edit.block} with nothing: use delete`);
      changes.set(edit.block, markdown);
    }
  }

  return { changes, insertsAfter };
}
