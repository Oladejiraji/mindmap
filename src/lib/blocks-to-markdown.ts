type InlineContent = {
  type: string;
  text?: string;
  content?: InlineContent[];
  href?: string;
  styles?: Record<string, boolean | string>;
};

type Block = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?:
    | InlineContent[]
    | { type: "tableContent"; rows: { cells: InlineContent[][] }[] };
  children?: Block[];
};

function inlineToText(content: InlineContent[] | undefined): string {
  if (!content) return "";
  return content
    .map((item) => {
      if (item.type === "text") {
        let text = item.text ?? "";
        if (item.styles?.bold) text = `**${text}**`;
        if (item.styles?.italic) text = `*${text}*`;
        if (item.styles?.code) text = `\`${text}\``;
        if (item.styles?.strikethrough) text = `~~${text}~~`;
        return text;
      }
      if (item.type === "link") {
        const linkText = inlineToText(item.content);
        return `[${linkText}](${item.href ?? ""})`;
      }
      return item.text ?? "";
    })
    .join("");
}

function blockToMarkdown(block: Block, depth: number = 0): string {
  const indent = "  ".repeat(depth);
  let line = "";

  const content = Array.isArray(block.content)
    ? inlineToText(block.content as InlineContent[])
    : "";

  switch (block.type) {
    case "heading": {
      const level = (block.props?.level as number) ?? 1;
      line = `${"#".repeat(level)} ${content}`;
      break;
    }
    case "bulletListItem":
      line = `${indent}- ${content}`;
      break;
    case "numberedListItem":
      line = `${indent}1. ${content}`;
      break;
    case "checkListItem": {
      const checked = block.props?.checked ? "x" : " ";
      line = `${indent}- [${checked}] ${content}`;
      break;
    }
    case "codeBlock":
      line = `\`\`\`${(block.props?.language as string) ?? ""}\n${content}\n\`\`\``;
      break;
    case "blockquote":
      line = `> ${content}`;
      break;
    case "table": {
      const tableContent = block.content as
        | { type: "tableContent"; rows: { cells: InlineContent[][] }[] }
        | undefined;
      if (
        tableContent?.type === "tableContent" &&
        tableContent.rows?.length > 0
      ) {
        const rows = tableContent.rows.map((row) =>
          row.cells.map((cell) => inlineToText(cell)).join(" | "),
        );
        line = `| ${rows[0]} |\n| ${rows[0]
          .split(" | ")
          .map(() => "---")
          .join(" | ")} |`;
        for (let i = 1; i < rows.length; i++) {
          line += `\n| ${rows[i]} |`;
        }
      }
      break;
    }
    case "paragraph":
    default:
      line = content;
      break;
  }

  const childLines =
    block.children
      ?.map((child) => blockToMarkdown(child, depth + 1))
      .join("\n") ?? "";

  return childLines ? `${line}\n${childLines}` : line;
}

export function blocksToMarkdown(blocks: Block[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks.map((block) => blockToMarkdown(block)).join("\n\n");
}

export function blocksToPlainText(blocks: Block[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .map((block) => {
      const content = Array.isArray(block.content)
        ? (block.content as InlineContent[]).map((i) => i.text ?? "").join("")
        : "";
      const childText =
        block.children?.map((c) => blocksToPlainText([c])).join(" ") ?? "";
      return [content, childText].filter(Boolean).join(" ");
    })
    .join(" ");
}
