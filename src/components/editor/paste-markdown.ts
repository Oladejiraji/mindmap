import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/*
 * Tiptap pastes plain text as-is, so pasted markdown (notes, a copied AI
 * reply) would show its ** and ## literally. When plain text looks like
 * markdown, parse it into formatted content instead. Follows the "Paste
 * Markdown Detection" example in Tiptap's markdown docs.
 */

const MARKDOWN_SIGNS = [
  /^#{1,6}\s/m, // heading
  /^\s*([-*+]|\d+[.)])\s/m, // list item
  /^\s*[-*+]\s\[[ xX]\]\s/m, // task item
  /^>\s/m, // quote
  /^```/m, // code fence
  /^\|.*\|\s*$/m, // table row
  /\*\*[^*\n]+\*\*/, // bold
  /~~[^~\n]+~~/, // strikethrough
  /\[[^\]\n]+\]\([^)\s]+\)/, // link
  /`[^`\n]+`/, // inline code
];

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_SIGNS.some((sign) => sign.test(text));
}

export const PasteMarkdown = Extension.create({
  name: "pasteMarkdown",

  addProseMirrorPlugins() {
    const { editor } = this;
    return [
      new Plugin({
        key: new PluginKey("pasteMarkdown"),
        props: {
          handlePaste(view, event) {
            // Inside a code block, paste stays literal.
            if (view.state.selection.$from.parent.type.spec.code) return false;

            const text = event.clipboardData?.getData("text/plain");
            if (!text || !editor.markdown || !looksLikeMarkdown(text)) return false;

            editor.commands.insertContent(editor.markdown.parse(text));
            return true;
          },
        },
      }),
    ];
  },
});
