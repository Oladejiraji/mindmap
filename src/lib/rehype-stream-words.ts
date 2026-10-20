/*
 * Rehype plugin for a reply that's still streaming: wraps each word of
 * the text in <span class="stream-word"> so new words fade in as they
 * arrive. React keeps the spans already on screen (same position in the
 * tree), so only newly added words animate. Code is left alone.
 */
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const SKIP = new Set(["code", "pre"]);

function wrapWords(node: HastNode) {
  if (!node.children) return;
  const next: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value) {
      // Keep the whitespace with the word before it so spacing is unchanged
      for (const part of child.value.match(/\S+\s*|\s+/g) ?? []) {
        next.push(
          /^\s+$/.test(part)
            ? { type: "text", value: part }
            : {
                type: "element",
                tagName: "span",
                properties: { className: ["stream-word"] },
                children: [{ type: "text", value: part }],
              },
        );
      }
    } else {
      if (child.type === "element" && !SKIP.has(child.tagName ?? "")) wrapWords(child);
      next.push(child);
    }
  }
  node.children = next;
}

export function rehypeStreamWords() {
  return (tree: HastNode) => wrapWords(tree);
}
