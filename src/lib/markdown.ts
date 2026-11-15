/**
 * Markdown to one line of plain text, for snippets and emptiness checks.
 * Strips syntax, keeps the words. Not a full parser: good enough for previews.
 */
export function markdownToPlainText(markdown: string | undefined): string {
  if (!markdown) return "";
  return markdown
    .replace(/^```.*$/gm, "") // code fence lines
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, "") // table divider rows
    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, "") // horizontal rules
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images → alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → label
    .replace(/^\s{0,3}(#{1,6}|>)\s?/gm, "") // headings, quotes
    .replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, "") // list markers, task boxes
    .replace(/(\*\*|__|~~|`)/g, "") // bold, strike, code
    .replace(/(^|\W)[*_](\S[^*_]*)[*_](?=\W|$)/g, "$1$2") // italic
    .replace(/\|/g, " ") // table cell bars
    .replace(/\s+/g, " ")
    .trim();
}
