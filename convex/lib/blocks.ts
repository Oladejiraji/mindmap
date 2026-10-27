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
      if (item.type === "text") return item.text ?? "";
      if (item.type === "link") return inlineToText(item.content);
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
      line = `\`\`\`\n${content}\n\`\`\``;
      break;
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

export function contentToMarkdown(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (content as Block[]).map((block) => blockToMarkdown(block)).join("\n\n");
  }
  return "";
}
