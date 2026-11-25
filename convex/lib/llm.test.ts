import { describe, expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import type { PromptContext } from "./context";
import { applyEdits, type DocumentEdit } from "./document";
import { readProposal } from "./llm";
import { PROPOSE_TOOL } from "./tools";

const nodeId = "n" as Id<"nodes">;
const context = (markdown: string, draft?: PromptContext["draft"], children: string[] = []): PromptContext => ({
  ancestors: [],
  current: { nodeId, title: "Trip", markdown },
  children,
  contentVersion: 3,
  messages: [],
  ...(draft && { draft }),
});
const call = (edits: DocumentEdit[], reason = "Why", branches?: { title: string; content: string }[]) =>
  [
    { type: "tool-call", toolCallId: "c", toolName: PROPOSE_TOOL, input: { reason, edits, branches }, dynamic: false },
  ] as unknown as Parameters<typeof readProposal>[0];

describe("readProposal", () => {
  test("keeps the model's edits as they are without an edit waiting", () => {
    const edits: DocumentEdit[] = [{ type: "replace", block: 1, markdown: "Two" }];
    expect(readProposal(call(edits), context("One"))).toEqual({ baseVersion: 3, reason: "Why", edits });
  });

  test("drops edits that don't fit the document", () => {
    expect(readProposal(call([{ type: "delete", block: 5 }]), context("One"))).toBeUndefined();
  });

  test("builds on the waiting edit: the new suggestion carries both", () => {
    // Waiting: a Budget section. New, on the draft: a packing list.
    const draft = { markdown: "Plan\n\nBudget", reason: "Adds a budget", branches: [] };
    const proposal = readProposal(
      call([{ type: "insert", after: 2, markdown: "Packing" }], "Adds a budget and a packing list"),
      context("Plan", draft),
    );
    expect(proposal?.baseVersion).toBe(3);
    expect(applyEdits("Plan", proposal!.edits)).toBe("Plan\n\nBudget\n\nPacking");
  });

  test("can change or drop the waiting changes", () => {
    const draft = { markdown: "Plan\n\nBudget", reason: "Adds a budget", branches: [] };
    const proposal = readProposal(call([{ type: "replace", block: 2, markdown: "Budget: $500" }]), context("Plan", draft));
    expect(applyEdits("Plan", proposal!.edits)).toBe("Plan\n\nBudget: $500");
    // Undoing all of them leaves nothing to suggest.
    expect(readProposal(call([{ type: "delete", block: 2 }]), context("Plan", draft))).toBeUndefined();
  });

  test("adds branches, tidied: no empty, repeated or existing titles", () => {
    const proposal = readProposal(
      call([], "Splits it up", [
        { title: " Budget ", content: "Costs." },
        { title: "budget", content: "Again." },
        { title: "", content: "No title." },
        { title: "Packing", content: "Bags." },
      ]),
      context("Plan", undefined, ["Packing"]),
    );
    expect(proposal).toEqual({ baseVersion: 3, reason: "Splits it up", edits: [], branches: [{ title: "Budget", content: "Costs." }] });
  });

  test("keeps valid branches when the edits don't fit", () => {
    const proposal = readProposal(
      call([{ type: "delete", block: 9 }], "Why", [{ title: "Budget", content: "Costs." }]),
      context("One"),
    );
    expect(proposal?.edits).toEqual([]);
    expect(proposal?.branches).toHaveLength(1);
  });

  test("with only branches, keeps the waiting edits", () => {
    const draft = { markdown: "Plan\n\nBudget", reason: "Adds a budget", branches: [] };
    const proposal = readProposal(call([], "Why", [{ title: "Packing", content: "Bags." }]), context("Plan", draft));
    expect(applyEdits("Plan", proposal!.edits)).toBe("Plan\n\nBudget");
    expect(proposal?.branches).toEqual([{ title: "Packing", content: "Bags." }]);
  });
});
