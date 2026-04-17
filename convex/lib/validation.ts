// Provisional cap. Real chatbots (ChatGPT, Claude.ai) let the user paste much more
// and bucket anything larger into a file attachment — we should do the same eventually.
// Until then, 32k chars keeps Convex doc size + LLM context bounded.
export const MAX_MESSAGE_CONTENT = 32_000;
export const MAX_TITLE = 120;

export function normalizeMessageContent(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("Message content cannot be empty");
  }
  if (trimmed.length > MAX_MESSAGE_CONTENT) {
    throw new Error(
      `Message content exceeds ${MAX_MESSAGE_CONTENT} characters`,
    );
  }
  return trimmed;
}

export function normalizeTitle(raw: string, field = "Title"): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} cannot be empty`);
  }
  if (trimmed.length > MAX_TITLE) {
    throw new Error(`${field} exceeds ${MAX_TITLE} characters`);
  }
  return trimmed;
}
