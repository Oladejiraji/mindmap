import { tool } from "ai";
import { z } from "zod";

/*
 * Tools the chat model can call. None of them run on their own: the model
 * calls the tool, the reply ends, and the call is stored for the user to
 * answer (see streamAssistantResponse).
 */

export const PROPOSE_EDIT_TOOL = "propose_document_edit";

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

export const chatTools = {
  [PROPOSE_EDIT_TOOL]: tool({
    description:
      "Suggest changes to the document in <current_node>. The user accepts or rejects them. Call at most once per reply, after your text.",
    inputSchema: z.object({
      reason: z
        .string()
        .describe("One short sentence on what changes and why, shown to the user. Example: 'Records the switch to usage-based pricing'."),
      edits: z.array(editSchema).min(1),
    }),
  }),
};
