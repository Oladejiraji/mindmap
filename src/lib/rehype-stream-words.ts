/*
 * Rehype plugin for a reply that's still streaming: new words fade in as
 * they arrive, and words already shown never fade again.
 *
 * Each word is identified by its position in the reply (nth word), and
 * the time it first appeared is kept in `arrivals`. A word still within
 * its fade is wrapped in a span (animate-word-in) with a negative
 * animation-delay of its age, so if half-finished markdown makes React
 * rebuild it (an unclosed **bold** closing, say), it resumes mid-fade
 * instead of starting over. Older words are left as plain text. Code is
 * left alone.
 */
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export const STREAM_FADE_MS = 450;
const SKIP = new Set(["code", "pre"]);

export function rehypeStreamWords({ arrivals }: { arrivals: Map<number, number> }) {
  return (tree: HastNode) => {
    const now = Date.now();
    let index = 0;
    const walk = (node: HastNode) => {
      if (!node.children) return;
      const next: HastNode[] = [];
      for (const child of node.children) {
        if (child.type === "text" && child.value) {
          // Keep the whitespace with the word before it so spacing is unchanged
          for (const part of child.value.match(/\S+\s*|\s+/g) ?? []) {
            if (/^\s+$/.test(part)) {
              next.push({ type: "text", value: part });
              continue;
            }
            const i = index++;
            if (!arrivals.has(i)) arrivals.set(i, now);
            const age = now - (arrivals.get(i) ?? now);
            next.push(
              age >= STREAM_FADE_MS
                ? { type: "text", value: part }
                : {
                    type: "element",
                    tagName: "span",
                    properties: {
                      className: ["animate-word-in", "motion-reduce:animate-none"],
                      style: `animation-delay:-${age}ms`,
                    },
                    children: [{ type: "text", value: part }],
                  },
            );
          }
        } else {
          if (child.type === "element" && !SKIP.has(child.tagName ?? "")) walk(child);
          next.push(child);
        }
      }
      node.children = next;
    };
    walk(tree);
  };
}
