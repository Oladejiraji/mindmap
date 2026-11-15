import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { modules } from "./test.setup";
import * as messagesModule from "./messages";

/*
 * Convex has no row-level security, so every function that touches a thread,
 * node, chat or message checks ownership by hand. These tests pin that down:
 * for each function, the owner succeeds, another user is refused (and nothing
 * changes), and a signed-out caller is refused.
 *
 * Another user gets NOT_FOUND rather than "forbidden", so they can't even
 * learn that the record exists.
 */

const NOT_FOUND = { data: { code: "NOT_FOUND" } };
const UNAUTHORIZED = { data: { code: "UNAUTHORIZED" } };

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);

  // Alice owns a thread: root → child, with a chat on the child.
  const ids = await t.run(async (ctx) => {
    const threadId = await ctx.db.insert("threads", { userId: "alice", name: "Alice's project" });
    const rootId = await ctx.db.insert("nodes", {
      userId: "alice",
      threadId,
      parentId: null,
      title: "Root",
    });
    const childId = await ctx.db.insert("nodes", {
      userId: "alice",
      threadId,
      parentId: rootId,
      title: "Child",
    });
    const chatId = await ctx.db.insert("chats", { nodeId: childId });
    await ctx.db.insert("messages", { chatId, role: "user", content: "Alice's secret", index: 0 });
    return { threadId, rootId, childId };
  });

  return {
    t,
    ...ids,
    alice: t.withIdentity({ subject: "alice" }),
    bob: t.withIdentity({ subject: "bob" }),
  };
}

describe("threads", () => {
  test("list only returns the caller's threads", async () => {
    const { alice, bob, threadId } = await setup();
    expect((await alice.query(api.threads.list, {})).map((th) => th._id)).toEqual([threadId]);
    expect(await bob.query(api.threads.list, {})).toEqual([]);
  });

  test("get", async () => {
    const { t, alice, bob, threadId } = await setup();
    await expect(alice.query(api.threads.get, { threadId })).resolves.toMatchObject({ _id: threadId });
    await expect(bob.query(api.threads.get, { threadId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.query(api.threads.get, { threadId })).rejects.toMatchObject(UNAUTHORIZED);
  });

  test("rename", async () => {
    const { t, alice, bob, threadId } = await setup();
    await expect(bob.mutation(api.threads.rename, { threadId, name: "Hacked" })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.threads.rename, { threadId, name: "Hacked" })).rejects.toMatchObject(UNAUTHORIZED);
    expect((await t.run((ctx) => ctx.db.get(threadId)))?.name).toBe("Alice's project");

    await alice.mutation(api.threads.rename, { threadId, name: "Renamed" });
    expect((await t.run((ctx) => ctx.db.get(threadId)))?.name).toBe("Renamed");
  });

  test("remove", async () => {
    const { t, alice, bob, threadId } = await setup();
    await expect(bob.mutation(api.threads.remove, { threadId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.threads.remove, { threadId })).rejects.toMatchObject(UNAUTHORIZED);
    expect(await t.run((ctx) => ctx.db.get(threadId))).not.toBeNull();

    await alice.mutation(api.threads.remove, { threadId });
    expect(await t.run((ctx) => ctx.db.get(threadId))).toBeNull();
  });

  test("create always assigns the thread to the caller", async () => {
    const { t, bob } = await setup();
    const { threadId, rootNodeId } = await bob.mutation(api.threads.create, { name: "Bob's" });
    const [thread, root] = await t.run((ctx) => Promise.all([ctx.db.get(threadId), ctx.db.get(rootNodeId)]));
    expect(thread?.userId).toBe("bob");
    expect(root?.userId).toBe("bob");
    await expect(t.mutation(api.threads.create, {})).rejects.toMatchObject(UNAUTHORIZED);
  });
});

describe("nodes", () => {
  test("listByThread", async () => {
    const { t, alice, bob, threadId } = await setup();
    await expect(alice.query(api.nodes.listByThread, { threadId })).resolves.toHaveLength(2);
    await expect(bob.query(api.nodes.listByThread, { threadId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.query(api.nodes.listByThread, { threadId })).rejects.toMatchObject(UNAUTHORIZED);
  });

  test("get", async () => {
    const { t, alice, bob, childId } = await setup();
    await expect(alice.query(api.nodes.get, { nodeId: childId })).resolves.toMatchObject({ _id: childId });
    await expect(bob.query(api.nodes.get, { nodeId: childId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.query(api.nodes.get, { nodeId: childId })).rejects.toMatchObject(UNAUTHORIZED);
  });

  test("rename", async () => {
    const { t, alice, bob, childId } = await setup();
    await expect(bob.mutation(api.nodes.rename, { nodeId: childId, title: "Hacked" })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.nodes.rename, { nodeId: childId, title: "Hacked" })).rejects.toMatchObject(UNAUTHORIZED);
    expect((await t.run((ctx) => ctx.db.get(childId)))?.title).toBe("Child");

    await alice.mutation(api.nodes.rename, { nodeId: childId, title: "Renamed" });
    expect((await t.run((ctx) => ctx.db.get(childId)))?.title).toBe("Renamed");
  });

  test("updatePosition", async () => {
    const { t, alice, bob, childId } = await setup();
    const position = { x: 10, y: 20 };
    await expect(bob.mutation(api.nodes.updatePosition, { nodeId: childId, position })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.nodes.updatePosition, { nodeId: childId, position })).rejects.toMatchObject(UNAUTHORIZED);
    expect((await t.run((ctx) => ctx.db.get(childId)))?.position).toBeUndefined();

    await alice.mutation(api.nodes.updatePosition, { nodeId: childId, position });
    expect((await t.run((ctx) => ctx.db.get(childId)))?.position).toEqual(position);
  });

  test("updateContent", async () => {
    const { t, alice, bob, childId } = await setup();
    const content = [{ type: "paragraph", content: [{ type: "text", text: "Hi", styles: {} }] }];
    await expect(bob.mutation(api.nodes.updateContent, { nodeId: childId, content })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.nodes.updateContent, { nodeId: childId, content })).rejects.toMatchObject(UNAUTHORIZED);
    expect((await t.run((ctx) => ctx.db.get(childId)))?.content).toBeUndefined();

    await alice.mutation(api.nodes.updateContent, { nodeId: childId, content });
    expect((await t.run((ctx) => ctx.db.get(childId)))?.content).toEqual(content);
  });

  test("createEmptyBranch can't attach a branch to someone else's node", async () => {
    const { t, alice, bob, rootId } = await setup();
    await expect(bob.mutation(api.nodes.createEmptyBranch, { parentId: rootId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.nodes.createEmptyBranch, { parentId: rootId })).rejects.toMatchObject(UNAUTHORIZED);

    const { childId } = await alice.mutation(api.nodes.createEmptyBranch, { parentId: rootId });
    expect((await t.run((ctx) => ctx.db.get(childId)))?.userId).toBe("alice");
  });

  test("deleteLeafNode", async () => {
    const { t, alice, bob, childId } = await setup();
    await expect(bob.mutation(api.nodes.deleteLeafNode, { nodeId: childId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.nodes.deleteLeafNode, { nodeId: childId })).rejects.toMatchObject(UNAUTHORIZED);
    expect(await t.run((ctx) => ctx.db.get(childId))).not.toBeNull();

    await alice.mutation(api.nodes.deleteLeafNode, { nodeId: childId });
    expect(await t.run((ctx) => ctx.db.get(childId))).toBeNull();
  });

  test("deleteSubtree", async () => {
    const { t, alice, bob, rootId, childId } = await setup();
    await expect(bob.mutation(api.nodes.deleteSubtree, { nodeId: rootId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.nodes.deleteSubtree, { nodeId: rootId })).rejects.toMatchObject(UNAUTHORIZED);
    expect(await t.run((ctx) => ctx.db.get(childId))).not.toBeNull();

    await expect(alice.mutation(api.nodes.deleteSubtree, { nodeId: rootId })).resolves.toEqual({ deletedCount: 2 });
  });

  test("assertOwned, the check the chat action runs before calling the AI", async () => {
    const { t, alice, bob, childId } = await setup();
    await expect(alice.query(internal.nodes.assertOwned, { nodeId: childId })).resolves.toMatchObject({ _id: childId });
    await expect(bob.query(internal.nodes.assertOwned, { nodeId: childId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.query(internal.nodes.assertOwned, { nodeId: childId })).rejects.toMatchObject(UNAUTHORIZED);
  });
});

describe("messages", () => {
  test("listByNode", async () => {
    const { t, alice, bob, childId } = await setup();
    const own = await alice.query(api.messages.listByNode, { nodeId: childId });
    expect(own.map((m) => m.content)).toEqual(["Alice's secret"]);
    await expect(bob.query(api.messages.listByNode, { nodeId: childId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.query(api.messages.listByNode, { nodeId: childId })).rejects.toMatchObject(UNAUTHORIZED);
  });

  test("the browser has no way to write messages directly", () => {
    // Only chat.sendMessage (an action, which runs the AI) can add to a chat.
    const publicMutations = Object.entries(messagesModule)
      .filter(([, fn]) => (fn as { isMutation?: boolean; isPublic?: boolean }).isMutation)
      .filter(([, fn]) => (fn as { isPublic?: boolean }).isPublic)
      .map(([name]) => name);
    expect(publicMutations).toEqual([]);
  });

  test("appendUserMessage saves a user message and still checks ownership", async () => {
    const { t, alice, bob, childId } = await setup();
    const msg = { nodeId: childId, content: "Injected" };
    await expect(bob.mutation(internal.messages.appendUserMessage, msg)).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(internal.messages.appendUserMessage, msg)).rejects.toMatchObject(UNAUTHORIZED);
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toHaveLength(1);

    await alice.mutation(internal.messages.appendUserMessage, { nodeId: childId, content: "Mine" });
    const messages = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(messages.at(-1)).toMatchObject({ role: "user", content: "Mine", index: 1 });
  });
});
