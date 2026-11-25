import { tool } from "ai";
import { z } from "zod";

/*
 * Tools the chat model can call. None of them run on their own: the model
 * calls the tool, the reply ends, and the call is stored for the user to
 * answer (see streamAssistantResponse).
 */

export const PROPOSE_TOOL = "propose_changes";

/** The most branches one suggestion can add. */
export const MAX_BRANCHES = 6;

const blockNumber = z.number().int().min(1).describe("A block number from <current_node>.");

const editSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("replace"),
    block: blockNumber,
    markdown: z.string().describe("The new content for the block. May be several blocks."),
  }),
  z.object({
    type: z.literal("insert"),
    after: z.number().int().min(0).describe("Insert after this block number. 0 inserts at the top."),
    markdown: z.string().describe("The content to insert. May be several blocks."),
  }),
  z.object({
    type: z.literal("delete"),
    block: blockNumber,
  }),
]);

const branchSchema = z.object({
  title: z.string().describe("A short title for the new node, 2 to 6 words."),
  content: z
    .string()
    .describe(
      "Its starting document, as markdown: 2 or 3 short lines on what this branch explores and anything already established. The user grows it from there; don't write it out in full.",
    ),
});

export const chatTools = {
  [PROPOSE_TOOL]: tool({
    description:
      "Suggest changes to <current_node>: edits to its document, new branches (child nodes) under it, or both. The user accepts all, some or none of them. Call at most once per reply, after your text.",
    inputSchema: z.object({
      reason: z
        .string()
        .describe(
          "One short sentence on what changes and why, shown to the user. Example: 'Records the switch to usage-based pricing'.",
        ),
      edits: z.array(editSchema).optional().describe("Edits to the document. Leave out to only add branches."),
      branches: z
        .array(branchSchema)
        .max(MAX_BRANCHES)
        .optional()
        .describe("New child nodes under <current_node>. Leave out to only edit the document."),
    }),
  }),
};
