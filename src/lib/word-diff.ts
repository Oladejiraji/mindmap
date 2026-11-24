/*
 * Word-level changes between two versions of a markdown block, for
 * showing a rewrite inline: one block, with removed words and new words
 * marked where they are. The marks are private-use characters around the
 * changed words, left in the markdown so it still parses as one block;
 * rehypeEditMarks (in edit-markdown) turns them into highlights.
 */

export const MARK_ADDED = "";
export const MARK_REMOVED = "";
export const MARK_END = "";

/** Past this share of words changed, word marks are noise: show whole blocks. */
const MAX_CHANGED = 0.6;
/** Longer blocks than this (in words and spaces) aren't compared word by word. */
const MAX_TOKENS = 600;

type Op = { kind: "same" | "removed" | "added"; token: string };

const isSpace = (token: string) => /^\s+$/.test(token);

/** Words and the whitespace between them, in order. */
function tokenize(markdown: string) {
  return markdown.split(/(\s+)/).filter((token) => token !== "");
}

/** The longest common run of tokens, as same / removed / added steps. */
function diffTokens(a: string[], b: string[]): Op[] {
  const common = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      common[i][j] = a[i] === b[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      ops.push({ kind: "same", token: a[i++] });
      j++;
    } else if (j < b.length && (i >= a.length || common[i][j + 1] >= common[i + 1][j])) {
      ops.push({ kind: "added", token: b[j++] });
    } else {
      ops.push({ kind: "removed", token: a[i++] });
    }
  }
  return ops;
}

/**
 * A space kept between two changes belongs to the change, so "red big" →
 * "blue small" reads as one swap, not two.
 */
function absorbSpaces(ops: Op[]): Op[] {
  const out: Op[] = [];
  ops.forEach((op, i) => {
    const changedAround =
      op.kind === "same" &&
      isSpace(op.token) &&
      ops[i - 1] &&
      ops[i - 1].kind !== "same" &&
      ops[i + 1] &&
      ops[i + 1].kind !== "same";
    if (changedAround) {
      out.push({ kind: "removed", token: op.token }, { kind: "added", token: op.token });
    } else out.push(op);
  });
  return out;
}

/**
 * The block's new version with the removed words and new words marked in
 * place, or null when a word-by-word view wouldn't help or would break
 * the markdown: most of it changed, a change crosses a line or a table
 * cell, it's a code block, or it's very long. Within a table's cells, it
 * works like any text.
 */
export function inlineWordDiff(before: string, after: string): string | null {
  if (/^(```|~~~)/m.test(before) || /^(```|~~~)/m.test(after)) return null;
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length + b.length > MAX_TOKENS) return null;

  const ops = absorbSpaces(diffTokens(a, b));
  // Marks can't cross a line or a table cell's border without breaking the
  // markdown (a list item, a table row): show whole blocks then.
  if (ops.some((op) => op.kind !== "same" && /[\n|]/.test(op.token))) return null;
  const words = (kind: Op["kind"]) => ops.filter((op) => op.kind === kind && !isSpace(op.token)).length;
  const changed = words("removed") + words("added");
  const total = words("same") * 2 + changed;
  if (changed === 0 || changed / total > MAX_CHANGED) return null;

  // Between kept words: what goes, then what comes, keeping the spacing
  // that led into and out of the change outside the marks.
  let out = "";
  let removed = "";
  let added = "";
  const flush = () => {
    const side = added || removed;
    out += side.match(/^\s*/)![0];
    if (removed.trim()) out += MARK_REMOVED + removed.trim() + MARK_END;
    if (removed.trim() && added.trim()) out += " ";
    if (added.trim()) out += MARK_ADDED + added.trim() + MARK_END;
    out += side.match(/\s*$/)![0];
    removed = "";
    added = "";
  };
  for (const op of ops) {
    if (op.kind === "removed") removed += op.token;
    else if (op.kind === "added") added += op.token;
    else {
      if (removed || added) flush();
      out += op.token;
    }
  }
  if (removed || added) flush();
  return out;
}
