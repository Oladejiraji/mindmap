/**
 * The one converter from BlockNote JSON (how node content is stored) to text.
 * Shared by the backend (AI context) and the frontend (canvas previews,
 * snippets), so what the AI sees and what the user sees cannot drift apart.
 *
 * Pure functions with no imports: safe to load in Convex and in the browser.
 * Covers BlockNote's default schema (v0.55). Unknown block or inline types
 * fall back to their text, so new content degrades instead of disappearing.
 *
 * What markdown can't carry is dropped on purpose: underline, text and
 * background colors, alignment, column widths, media dimensions.
 */

type Styles = Record<string, boolean | string | undefined>;

type InlineContent = {
  type: string;
  text?: string;
  href?: string;
  styles?: Styles;
  content?: InlineContent[];
};

type TableCell = { type: "tableCell"; content?: InlineContent[] };

type TableContent = {
  type: "tableContent";
  headerRows?: number;
  rows: { cells: (InlineContent[] | TableCell)[] }[];
};

type Block = {
  type: string;
  props?: Record<string, unknown>;
  content?: InlineContent[] | TableContent;
  children?: Block[];
};

const LIST_TYPES = new Set([
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
]);

/** Converts stored node content to markdown. Accepts anything `content` may hold. */
export function contentToMarkdown(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return blocksToMarkdown(content as Block[], 0).trim();
}

/** Converts stored node content to a single line of plain text, for snippets. */
export function contentToPlainText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return blocksToPlainText(content as Block[]).replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Markdown

function blocksToMarkdown(blocks: Block[], depth: number): string {
  const out: string[] = [];
  let prev: Block | undefined;
  let number = 0;

  for (const block of blocks) {
    // Numbered items count up within a run of consecutive siblings.
    if (block.type === "numberedListItem") {
      const start = block.props?.start;
      number =
        prev?.type === "numberedListItem"
          ? number + 1
          : typeof start === "number"
            ? start
            : 1;
    }

    const text = blockToMarkdown(block, depth, number);
    if (text === "") {
      prev = block;
      continue;
    }

    // Keep a list tight; separate everything else (including a change of list kind) with a blank line.
    const tight = prev?.type === block.type && LIST_TYPES.has(block.type);
    if (out.length > 0) out.push(tight ? "\n" : "\n\n");
    out.push(text);
    prev = block;
  }

  return out.join("");
}

function blockToMarkdown(block: Block, depth: number, number: number): string {
  const indent = "  ".repeat(depth);
  const props = block.props ?? {};
  const text = Array.isArray(block.content) ? inlineToMarkdown(block.content) : "";

  let line: string;
  switch (block.type) {
    case "heading": {
      const level = clamp(Number(props.level) || 1, 1, 6);
      line = text ? `${"#".repeat(level)} ${text}` : "";
      break;
    }
    case "quote":
      line = text ? prefixLines(text, "> ") : "";
      break;
    case "bulletListItem":
    case "toggleListItem":
      line = `- ${text}`;
      break;
    case "numberedListItem":
      line = `${number}. ${text}`;
      break;
    case "checkListItem":
      line = `- [${props.checked ? "x" : " "}] ${text}`;
      break;
    case "codeBlock": {
      // Code keeps its raw text: no markdown styling inside a fence.
      const code = Array.isArray(block.content) ? inlineToPlainText(block.content) : "";
      const language = typeof props.language === "string" ? props.language : "";
      line = code ? `\`\`\`${language}\n${code}\n\`\`\`` : "";
      break;
    }
    case "table":
      line = tableToMarkdown(block.content);
      break;
    case "image": {
      const url = str(props.url);
      const alt = str(props.caption) || str(props.name);
      line = url ? `![${alt}](${url})` : "";
      break;
    }
    case "video":
    case "audio":
    case "file": {
      const url = str(props.url);
      const label = str(props.name) || str(props.caption) || block.type;
      line = url ? `[${label}](${url})` : "";
      break;
    }
    case "divider":
      line = "---";
      break;
    case "paragraph":
    default:
      line = text;
      break;
  }

  if (line) line = prefixLines(line, indent);

  const children = block.children?.length
    ? blocksToMarkdown(block.children, depth + 1)
    : "";

  if (!line) return children;
  return children ? `${line}\n${children}` : line;
}

function tableToMarkdown(content: Block["content"]): string {
  if (!content || Array.isArray(content) || content.type !== "tableContent") {
    return "";
  }
  const rows = content.rows.map((row) =>
    row.cells.map((cell) => {
      const inline = Array.isArray(cell) ? cell : (cell.content ?? []);
      return inlineToMarkdown(inline).replace(/\|/g, "\\|").replace(/\n/g, " ");
    }),
  );
  if (rows.length === 0) return "";

  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
  const line = (r: string[]) => `| ${pad(r).join(" | ")} |`;

  // Markdown tables need a header; BlockNote tables may not have one.
  // Without a header row, an empty one keeps the first data row as data.
  const hasHeader = (content.headerRows ?? 0) > 0;
  const header = hasHeader ? rows[0] : Array(width).fill("");
  const body = hasHeader ? rows.slice(1) : rows;
  const divider = `| ${Array(width).fill("---").join(" | ")} |`;

  return [line(header), divider, ...body.map(line)].join("\n");
}

function inlineToMarkdown(content: InlineContent[]): string {
  return content
    .map((item) => {
      if (item.type === "link") {
        const label = inlineToMarkdown(item.content ?? []);
        return item.href ? `[${label}](${item.href})` : label;
      }
      return styleText(item.text ?? "", item.styles);
    })
    .join("");
}

/** Wraps text in markdown style markers, keeping edge whitespace outside them. */
function styleText(text: string, styles: Styles | undefined): string {
  if (!styles || !text.trim()) return text;
  const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;

  let s = core;
  if (styles.code) s = `\`${s}\``;
  if (styles.strike) s = `~~${s}~~`;
  if (styles.italic) s = `*${s}*`;
  if (styles.bold) s = `**${s}**`;
  return `${lead}${s}${trail}`;
}

// ---------------------------------------------------------------------------
// Plain text

function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      let text = "";
      if (Array.isArray(block.content)) {
        text = inlineToPlainText(block.content);
      } else if (block.content?.type === "tableContent") {
        text = block.content.rows
          .flatMap((row) =>
            row.cells.map((cell) =>
              inlineToPlainText(Array.isArray(cell) ? cell : (cell.content ?? [])),
            ),
          )
          .join(" ");
      } else if (block.props) {
        text = str(block.props.caption) || str(block.props.name);
      }
      const children = block.children?.length ? blocksToPlainText(block.children) : "";
      return [text, children].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(" ");
}

function inlineToPlainText(content: InlineContent[]): string {
  return content
    .map((item) =>
      item.type === "link" ? inlineToPlainText(item.content ?? []) : (item.text ?? ""),
    )
    .join("");
}

// ---------------------------------------------------------------------------

function prefixLines(text: string, prefix: string): string {
  if (!prefix) return text;
  return text
    .split("\n")
    .map((l) => prefix + l)
    .join("\n");
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
