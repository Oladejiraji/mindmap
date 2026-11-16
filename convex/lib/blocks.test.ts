import { describe, expect, test } from "vitest";
import { contentToMarkdown } from "./blocks";

// Builders for BlockNote 0.55 JSON, shaped like what the editor emits.
const text = (t: string, styles: Record<string, boolean> = {}) => ({
  type: "text",
  text: t,
  styles,
});
const link = (label: string, href: string) => ({
  type: "link",
  href,
  content: [text(label)],
});
const block = (
  type: string,
  content: unknown[] = [],
  props: Record<string, unknown> = {},
  children: unknown[] = [],
) => ({ type, props, content, children });
const cell = (t: string) => ({
  type: "tableCell",
  props: { colspan: 1, rowspan: 1 },
  content: t ? [text(t)] : [],
});
const table = (rows: string[][], headerRows?: number) => ({
  type: "table",
  props: { textColor: "default" },
  content: {
    type: "tableContent",
    columnWidths: rows[0].map(() => undefined),
    headerRows,
    rows: rows.map((r) => ({ cells: r.map(cell) })),
  },
  children: [],
});

const md = (...blocks: unknown[]) => contentToMarkdown(blocks);

describe("contentToMarkdown: input handling", () => {
  test("empty and non-document values become an empty string", () => {
    expect(contentToMarkdown(undefined)).toBe("");
    expect(contentToMarkdown(null)).toBe("");
    expect(contentToMarkdown([])).toBe("");
    expect(contentToMarkdown({ not: "blocks" })).toBe("");
  });

  test("a plain string passes through unchanged", () => {
    expect(contentToMarkdown("already markdown")).toBe("already markdown");
  });

  test("empty paragraphs are dropped", () => {
    expect(md(block("paragraph"), block("paragraph", [text("Hi")]), block("paragraph"))).toBe("Hi");
  });
});

describe("contentToMarkdown: blocks", () => {
  test("headings use their level", () => {
    expect(md(block("heading", [text("Title")], { level: 2 }))).toBe("## Title");
  });

  test("paragraphs are separated by a blank line", () => {
    expect(md(block("paragraph", [text("One")]), block("paragraph", [text("Two")]))).toBe("One\n\nTwo");
  });

  test("quotes", () => {
    expect(md(block("quote", [text("Price is a feature")]))).toBe("> Price is a feature");
  });

  test("bullet lists stay tight and nest by indentation", () => {
    expect(
      md(
        block("bulletListItem", [text("Small teams")], {}, [
          block("bulletListItem", [text("< 10 seats")]),
        ]),
        block("bulletListItem", [text("Heavy users")]),
      ),
    ).toBe("- Small teams\n  - < 10 seats\n- Heavy users");
  });

  test("numbered lists count up and honour a start number", () => {
    expect(
      md(block("numberedListItem", [text("Draft")]), block("numberedListItem", [text("Review")])),
    ).toBe("1. Draft\n2. Review");
    expect(
      md(block("numberedListItem", [text("Later")], { start: 4 }), block("numberedListItem", [text("Next")])),
    ).toBe("4. Later\n5. Next");
  });

  test("a numbered list restarts after another block", () => {
    expect(
      md(
        block("numberedListItem", [text("A")]),
        block("paragraph", [text("Break")]),
        block("numberedListItem", [text("B")]),
      ),
    ).toBe("1. A\n\nBreak\n\n1. B");
  });

  test("a change of list kind is separated by a blank line", () => {
    expect(
      md(block("bulletListItem", [text("Bullet")]), block("numberedListItem", [text("Number")])),
    ).toBe("- Bullet\n\n1. Number");
  });

  test("check list items show their state", () => {
    expect(
      md(
        block("checkListItem", [text("Done")], { checked: true }),
        block("checkListItem", [text("Todo")], { checked: false }),
      ),
    ).toBe("- [x] Done\n- [ ] Todo");
  });

  test("toggle list items keep their hidden children", () => {
    expect(
      md(block("toggleListItem", [text("Details")], {}, [block("paragraph", [text("Hidden")])])),
    ).toBe("- Details\n  Hidden");
  });

  test("code blocks keep their language and raw text, with no styling", () => {
    expect(
      md(block("codeBlock", [text("const a = 1;", { bold: true })], { language: "ts" })),
    ).toBe("```ts\nconst a = 1;\n```");
  });

  test("dividers", () => {
    expect(md(block("divider"))).toBe("---");
  });

  test("images, files, video and audio become links", () => {
    expect(md(block("image", [], { url: "https://x.io/a.png", caption: "Chart", name: "a.png" }))).toBe(
      "![Chart](https://x.io/a.png)",
    );
    expect(md(block("file", [], { url: "https://x.io/spec.pdf", name: "spec.pdf" }))).toBe(
      "[spec.pdf](https://x.io/spec.pdf)",
    );
    expect(md(block("video", [], { url: "https://x.io/v.mp4" }))).toBe("[video](https://x.io/v.mp4)");
    expect(md(block("audio", [], { url: "https://x.io/a.mp3", name: "Call" }))).toBe(
      "[Call](https://x.io/a.mp3)",
    );
  });

  test("media without a URL is dropped", () => {
    expect(md(block("image", [], { url: "" }))).toBe("");
  });

  test("unknown block types fall back to their text", () => {
    expect(md(block("someFutureBlock", [text("Still here")]))).toBe("Still here");
  });
});

describe("contentToMarkdown: tables", () => {
  test("a header row becomes the markdown header", () => {
    expect(
      md(table([["Tier", "Price"], ["Free", "$0"]], 1)),
    ).toBe("| Tier | Price |\n| --- | --- |\n| Free | $0 |");
  });

  test("without a header row, every row stays data under an empty header", () => {
    expect(md(table([["Free", "$0"]]))).toBe("|  |  |\n| --- | --- |\n| Free | $0 |");
  });

  test("pipes inside cells are escaped", () => {
    expect(md(table([["A"], ["$0 | forever"]], 1))).toBe("| A |\n| --- |\n| $0 \\| forever |");
  });

  test("legacy cells stored as plain inline arrays still convert", () => {
    const legacy = {
      type: "table",
      content: { type: "tableContent", headerRows: 1, rows: [{ cells: [[text("Old")]] }] },
    };
    expect(md(legacy)).toBe("| Old |\n| --- |");
  });

  test("ragged rows are padded to the widest row", () => {
    expect(md(table([["A", "B"], ["C"]], 1))).toBe("| A | B |\n| --- | --- |\n| C |  |");
  });
});

describe("contentToMarkdown: inline styles", () => {
  test("bold, italic, strikethrough and code", () => {
    expect(
      md(
        block("paragraph", [
          text("bold", { bold: true }),
          text(" "),
          text("italic", { italic: true }),
          text(" "),
          text("struck", { strike: true }),
          text(" "),
          text("code", { code: true }),
        ]),
      ),
    ).toBe("**bold** *italic* ~~struck~~ `code`");
  });

  test("whitespace stays outside style markers", () => {
    expect(md(block("paragraph", [text("Keep "), text("simple ", { bold: true }), text("and")]))).toBe(
      "Keep **simple** and",
    );
  });

  test("links keep their URL", () => {
    expect(md(block("paragraph", [text("See "), link("Stripe", "https://stripe.com")]))).toBe(
      "See [Stripe](https://stripe.com)",
    );
  });

  test("styles markdown can't express are dropped, keeping the text", () => {
    expect(md(block("paragraph", [text("under", { underline: true })]))).toBe("under");
  });
});

