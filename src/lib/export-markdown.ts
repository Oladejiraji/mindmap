import type { ConvexReactClient } from "convex/react";
import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";

/*
 * Nodes as markdown, to copy or download. A branch becomes one document:
 * each node's title is a heading at its depth (the top node's is `#`),
 * with its document under it, its own headings moved down to sit inside.
 */

type ExportNode = Pick<Doc<"nodes">, "_id" | "_creationTime" | "parentId" | "title" | "content" | "position">;

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})(\s)/;

/** Moves a document's headings so the biggest is `level`. Code blocks are left alone. */
export function nestHeadings(markdown: string, level: number): string {
  const lines = markdown.split("\n");
  let inFence = false;
  let top = 7;
  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    else if (!inFence) top = Math.min(top, line.match(HEADING)?.[1].length ?? 7);
  }
  if (top === 7) return markdown;
  const shift = level - top;
  inFence = false;
  return lines
    .map((line) => {
      if (FENCE.test(line)) inFence = !inFence;
      if (inFence) return line;
      return line.replace(HEADING, (_, hashes: string, space: string) =>
        "#".repeat(Math.min(6, Math.max(1, hashes.length + shift))) + space,
      );
    })
    .join("\n");
}

/** A node and everything under it, as one markdown document. Children in canvas order, left to right. */
export function branchMarkdown(nodes: ExportNode[], rootId: Id<"nodes">, withBranches = true): string {
  const byId = new Map(nodes.map((node) => [node._id, node]));
  const children = new Map<Id<"nodes">, ExportNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  }
  const order = (a: ExportNode, b: ExportNode) =>
    (a.position?.x ?? 0) - (b.position?.x ?? 0) || a._creationTime - b._creationTime;

  const sections: string[] = [];
  const visit = (node: ExportNode, depth: number) => {
    const level = Math.min(6, depth + 1);
    const content = node.content?.trim();
    sections.push(`${"#".repeat(level)} ${node.title}`);
    if (content) sections.push(nestHeadings(content, Math.min(6, level + 1)));
    if (!withBranches) return;
    for (const child of [...(children.get(node._id) ?? [])].sort(order)) visit(child, depth + 1);
  };
  const root = byId.get(rootId);
  if (root) visit(root, 0);
  return sections.join("\n\n") + "\n";
}

/** A file name from a title: "Self-serve pricing" → "self-serve-pricing.md". */
export function markdownFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "untitled"}.md`;
}

/** Saves markdown as a file, through the browser's download. */
export function downloadMarkdown(fileName: string, markdown: string) {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Downloads a whole project, from its root, as one markdown file. */
export async function downloadProject(convex: ConvexReactClient, threadId: Id<"threads">, name: string) {
  const nodes = await convex.query(api.nodes.listByThread, { threadId });
  const root = nodes.find((node) => node.parentId === null);
  if (!root) return;
  downloadMarkdown(markdownFileName(name), branchMarkdown(nodes, root._id));
}
