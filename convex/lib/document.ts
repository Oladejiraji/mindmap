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
 * A changed block names the edit it comes from (its index in the edits),
 * so it can be left out when accepting.
 */
export type PreviewBlock =
  | { kind: "same"; markdown: string }
  | { kind: "added"; markdown: string; edit: number }
  | { kind: "rewritten"; markdown: string; before: string; edit: number }
  | { kind: "removed"; markdown: string; edit: number };

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

  const out = plan.insertsAfter[0].map((insert) => insert.markdown);
  blocks.forEach((block, i) => {
    const n = i + 1;
    const change = plan.changes.get(n);
    if (change === undefined) out.push(block);
    else if (change.markdown !== null) out.push(change.markdown);
    out.push(...plan.insertsAfter[n].map((insert) => insert.markdown));
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
  const added = (insert: Inserted): PreviewBlock => ({ kind: "added", markdown: insert.markdown, edit: insert.edit });

  const out: PreviewBlock[] = plan.insertsAfter[0].map(added);
  blocks.forEach((block, i) => {
    const n = i + 1;
    const change = plan.changes.get(n);
    if (change === undefined) out.push({ kind: "same", markdown: block });
    else if (change.markdown === null) out.push({ kind: "removed", markdown: block, edit: change.edit });
    else out.push({ kind: "rewritten", markdown: change.markdown, before: block, edit: change.edit });
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

/**
 * The edits that turn one document into another, block by block: blocks
 * in both stay, the rest are replaced (pairing old and new blocks in
 * order), deleted or inserted. Applying them to `before` gives `after`.
 * Used to turn an edit made on a draft into one on the real document.
 */
export function diffBlocks(before: string, after: string): DocumentEdit[] {
  const a = splitBlocks(before);
  const b = splitBlocks(after);
  // Longest common run of blocks, from each pair of positions to the end.
  const common = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      common[i][j] = a[i] === b[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }

  const edits: DocumentEdit[] = [];
  // A stretch between kept blocks: the old blocks that go, the new that come.
  let removed: number[] = [];
  let added: string[] = [];
  // The last old block passed (its number), where new blocks are inserted.
  let lastOld = 0;
  const flush = () => {
    const paired = Math.min(removed.length, added.length);
    for (let k = 0; k < paired; k++) edits.push({ type: "replace", block: removed[k], markdown: added[k] });
    for (const block of removed.slice(paired)) edits.push({ type: "delete", block });
    if (added.length > paired) edits.push({ type: "insert", after: lastOld, markdown: joinBlocks(added.slice(paired)) });
    removed = [];
    added = [];
  };

  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      i++;
      j++;
      lastOld = i;
    } else if (j < b.length && (i >= a.length || common[i][j + 1] >= common[i + 1][j])) {
      added.push(b[j++]);
    } else {
      removed.push(++i);
      lastOld = i;
    }
  }
  flush();
  return edits;
}

/**
 * The items to keep when accepting a suggestion in part, leaving out the
 * ones at `skip` (indices). Throws DocumentEditError for an index that
 * isn't there.
 */
export function keepEdits<T>(items: T[], skip: number[]): T[] {
  for (const i of skip) {
    if (!Number.isInteger(i) || i < 0 || i >= items.length) {
      throw new DocumentEditError(`There's no change ${i}: there are ${items.length}`);
    }
  }
  return items.filter((_, i) => !skip.includes(i));
}

/** A planned change: its markdown (null when deleted) and which edit made it. */
type Planned = { markdown: string | null; edit: number };
type Inserted = { markdown: string; edit: number };

function planEdits(blocks: string[], edits: DocumentEdit[]) {
  if (edits.length === 0) throw new DocumentEditError("No edits");

  const count = blocks.length;
  /** Block number → its change. */
  const changes = new Map<number, Planned>();
  const insertsAfter: Inserted[][] = Array.from({ length: count + 1 }, () => []);

  for (const [index, edit] of edits.entries()) {
    if (edit.type === "insert") {
      if (!Number.isInteger(edit.after) || edit.after < 0 || edit.after > count) {
        throw new DocumentEditError(`Can't insert after block ${edit.after}: the document has ${count} blocks`);
      }
      const markdown = edit.markdown.trim();
      if (!markdown) throw new DocumentEditError("An insert has no content");
      insertsAfter[edit.after].push({ markdown, edit: index });
      continue;
    }

    if (!Number.isInteger(edit.block) || edit.block < 1 || edit.block > count) {
      throw new DocumentEditError(`Block ${edit.block} doesn't exist: the document has ${count} blocks`);
    }
    if (changes.has(edit.block)) {
      throw new DocumentEditError(`Block ${edit.block} is changed more than once`);
    }
    if (edit.type === "delete") {
      changes.set(edit.block, { markdown: null, edit: index });
    } else {
      const markdown = edit.markdown.trim();
      if (!markdown) throw new DocumentEditError(`Replacing block ${edit.block} with nothing: use delete`);
      changes.set(edit.block, { markdown, edit: index });
    }
  }

  return { changes, insertsAfter };
}
