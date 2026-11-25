import { describe, expect, it } from "vitest";
import { applyEdits, describeEdits, diffBlocks, DocumentEditError, joinBlocks, keepEdits, previewEdits, splitBlocks } from "./document";

const DOC = [
  "# Pricing",
  "We compare **three** models.",
  "- Seat\n- Usage\n\n  a nested paragraph",
  "| a | b |\n|---|---|\n| 1 | 2 |",
  "```js\nconst x = 1;\n\n\nconst y = 2;\n```",
  "> a quote",
  "- [ ] a task\n- [x] done",
].join("\n\n");

describe("splitBlocks", () => {
  it("splits top-level elements, keeping a whole list, table or code block together", () => {
    const blocks = splitBlocks(DOC);
    expect(blocks).toHaveLength(7);
    expect(blocks[2]).toBe("- Seat\n- Usage\n\n  a nested paragraph");
    expect(blocks[4]).toContain("\n\n\nconst y");
  });

  it("round-trips the document", () => {
    expect(joinBlocks(splitBlocks(DOC))).toBe(DOC);
  });

  it("has no blocks when empty", () => {
    expect(splitBlocks("")).toEqual([]);
    expect(splitBlocks("  \n\n ")).toEqual([]);
  });

  it("ignores extra blank lines between blocks", () => {
    expect(splitBlocks("one\n\n\n\ntwo\n")).toEqual(["one", "two"]);
  });
});

describe("applyEdits", () => {
  const doc = "# A\n\nB\n\nC";

  it("replaces, inserts and deletes against the original numbering", () => {
    const out = applyEdits(doc, [
      { type: "delete", block: 2 },
      { type: "replace", block: 3, markdown: "C2" },
      { type: "insert", after: 0, markdown: "Top" },
      { type: "insert", after: 3, markdown: "End" },
    ]);
    expect(out).toBe("Top\n\n# A\n\nC2\n\nEnd");
  });

  it("keeps inserts at the same spot in the order given", () => {
    expect(
      applyEdits(doc, [
        { type: "insert", after: 1, markdown: "x" },
        { type: "insert", after: 1, markdown: "y" },
      ]),
    ).toBe("# A\n\nx\n\ny\n\nB\n\nC");
  });

  it("lets a replacement span several blocks", () => {
    expect(applyEdits(doc, [{ type: "replace", block: 2, markdown: "B1\n\nB2" }])).toBe("# A\n\nB1\n\nB2\n\nC");
  });

  it("writes into an empty document", () => {
    expect(applyEdits("", [{ type: "insert", after: 0, markdown: "# New" }])).toBe("# New");
  });

  it("leaves untouched blocks exactly as they were", () => {
    const out = applyEdits(DOC, [{ type: "replace", block: 1, markdown: "# Pricing v2" }]);
    expect(splitBlocks(out).slice(1)).toEqual(splitBlocks(DOC).slice(1));
  });

  it.each([
    ["a block that doesn't exist", [{ type: "delete" as const, block: 4 }]],
    ["block 0", [{ type: "replace" as const, block: 0, markdown: "x" }]],
    ["a fractional block", [{ type: "delete" as const, block: 1.5 }]],
    ["insert past the end", [{ type: "insert" as const, after: 4, markdown: "x" }]],
    ["the same block twice", [{ type: "delete" as const, block: 1 }, { type: "replace" as const, block: 1, markdown: "x" }]],
    ["an empty replacement", [{ type: "replace" as const, block: 1, markdown: "  " }]],
    ["an empty insert", [{ type: "insert" as const, after: 0, markdown: "" }]],
    ["no edits", []],
  ])("rejects %s", (_, edits) => {
    expect(() => applyEdits(doc, edits)).toThrow(DocumentEditError);
  });
});

describe("describeEdits", () => {
  it("pairs each edit with the block it changes, in document order", () => {
    expect(
      describeEdits("# A\n\nB\n\nC", [
        { type: "insert", after: 3, markdown: "End " },
        { type: "delete", block: 2 },
        { type: "replace", block: 1, markdown: "# A2" },
        { type: "insert", after: 1, markdown: "x" },
      ]),
    ).toEqual([
      { type: "replace", before: "# A", after: "# A2" },
      { type: "insert", before: null, after: "x" },
      { type: "delete", before: "B", after: null },
      { type: "insert", before: null, after: "End" },
    ]);
  });
});

describe("previewEdits", () => {
  const doc = "# Pricing\n\nSeat-based.\n\nOpen questions.";

  it("marks every block of the result with what happened to it", () => {
    expect(
      previewEdits(doc, [
        { type: "replace", block: 2, markdown: "Usage-based." },
        { type: "insert", after: 2, markdown: "- Per seat\n- Per call" },
        { type: "delete", block: 3 },
      ]),
    ).toEqual([
      { kind: "same", markdown: "# Pricing" },
      { kind: "rewritten", markdown: "Usage-based.", before: "Seat-based.", edit: 0 },
      { kind: "added", markdown: "- Per seat\n- Per call", edit: 1 },
      { kind: "removed", markdown: "Open questions.", edit: 2 },
    ]);
  });

  it("adds at the top, and agrees with applyEdits on what stays", () => {
    const edits = [{ type: "insert" as const, after: 0, markdown: "Summary." }];
    const preview = previewEdits(doc, edits);
    expect(preview[0]).toEqual({ kind: "added", markdown: "Summary.", edit: 0 });
    const kept = preview.filter((b) => b.kind !== "removed").map((b) => b.markdown);
    expect(joinBlocks(kept)).toBe(applyEdits(doc, edits));
  });

  it("rejects edits that don't fit, like applyEdits", () => {
    expect(() => previewEdits(doc, [{ type: "delete", block: 9 }])).toThrow(DocumentEditError);
  });
});

describe("keepEdits", () => {
  const edits = [
    { type: "delete" as const, block: 1 },
    { type: "insert" as const, after: 0, markdown: "A" },
    { type: "delete" as const, block: 2 },
  ];

  it("leaves out the skipped changes", () => {
    expect(keepEdits(edits, [1])).toEqual([edits[0], edits[2]]);
    expect(keepEdits(edits, [])).toEqual(edits);
  });

  it("refuses a change that isn't there", () => {
    expect(() => keepEdits(edits, [3])).toThrow(DocumentEditError);
    expect(keepEdits(edits, [0, 1, 2])).toEqual([]);
  });
});

describe("diffBlocks", () => {
  const doc = (...blocks: string[]) => joinBlocks(blocks);

  it("turns one document into the other", () => {
    const cases: [string, string][] = [
      [doc("A", "B", "C"), doc("A", "B2", "C")],
      [doc("A", "B", "C"), doc("A", "C")],
      [doc("A", "B"), doc("Z", "A", "B", "Y")],
      [doc("A", "B", "C"), doc("A", "X", "Y", "Z", "C")],
      [doc("A", "B", "C", "D"), doc("D", "C")],
      ["", doc("# New", "Text")],
      [DOC, doc("# Pricing", "We compare **four** models.", "> a quote")],
    ];
    for (const [before, after] of cases) {
      expect(applyEdits(before, diffBlocks(before, after))).toBe(joinBlocks(splitBlocks(after)));
    }
  });

  it("pairs old and new blocks as rewrites, then inserts or deletes the rest", () => {
    expect(diffBlocks(doc("A", "B", "C"), doc("A", "B2", "B3", "C"))).toEqual([
      { type: "replace", block: 2, markdown: "B2" },
      { type: "insert", after: 2, markdown: "B3" },
    ]);
    expect(diffBlocks(doc("A", "B", "C"), doc("A", "C"))).toEqual([{ type: "delete", block: 2 }]);
  });

  it("has no edits for the same document", () => {
    expect(diffBlocks(DOC, DOC)).toEqual([]);
  });
});
