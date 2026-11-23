import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { modules } from "./test.setup";

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  const alice = t.withIdentity({ subject: "alice" });
  const bob = t.withIdentity({ subject: "bob" });
  const { threadId, rootNodeId } = await alice.mutation(api.threads.create, { name: "Plan" });
  const childId = await t.run((ctx) => ctx.db.insert("nodes", { userId: "alice", threadId, parentId: rootNodeId, title: "Timeline" }));
  return { t, alice, bob, threadId, rootNodeId, childId };
}

describe("projectViews", () => {
  test("saves where you are, keeping only the keys it restores", async () => {
    const { alice, threadId, childId } = await setup();
    await alice.mutation(api.projectViews.save, { threadId, search: `?tour=1&panel=${childId}&tab=chat&utm=x` });
    expect(await alice.query(api.projectViews.get, { threadId })).toBe(`panel=${childId}&tab=chat`);
    // The tab links there too, and Home gets it.
    expect((await alice.query(api.tabs.list, {}))[0].search).toBe(`panel=${childId}&tab=chat`);
    expect(await alice.query(api.projectViews.mine, {})).toEqual({ [threadId]: `panel=${childId}&tab=chat` });
  });

  test("the canvas saves as an empty view", async () => {
    const { alice, threadId, childId } = await setup();
    await alice.mutation(api.projectViews.save, { threadId, search: `view=chat&node=${childId}` });
    await alice.mutation(api.projectViews.save, { threadId, search: "" });
    expect(await alice.query(api.projectViews.get, { threadId })).toBe("");
    expect(await alice.query(api.projectViews.mine, {})).toEqual({});
  });

  test("drops a node that's gone, and what depended on it", async () => {
    const { t, alice, threadId, rootNodeId, childId } = await setup();
    await alice.mutation(api.projectViews.save, { threadId, search: `view=chat&node=${childId}&panel=${childId}&tab=chat&chat=${rootNodeId}` });
    await t.run((ctx) => ctx.db.delete(childId));
    // The chat view needs its node, the tab needs its panel; the full-screen chat stays.
    expect(await alice.query(api.projectViews.get, { threadId })).toBe(`chat=${rootNodeId}`);
  });

  test("drops a node from another project, and junk ids", async () => {
    const { alice, threadId } = await setup();
    const other = await alice.mutation(api.threads.create, { name: "Other" });
    await alice.mutation(api.projectViews.save, { threadId, search: `panel=${other.rootNodeId}&chat=not-an-id` });
    expect(await alice.query(api.projectViews.get, { threadId })).toBe("");
  });

  test("views are per person, and only for your own projects", async () => {
    const { alice, bob, threadId, childId } = await setup();
    await alice.mutation(api.projectViews.save, { threadId, search: `panel=${childId}` });
    await expect(bob.mutation(api.projectViews.save, { threadId, search: "" })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(bob.query(api.projectViews.get, { threadId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    expect(await bob.query(api.projectViews.mine, {})).toEqual({});
  });

  test("deleting a project removes its views", async () => {
    const { t, alice, threadId, childId } = await setup();
    await alice.mutation(api.projectViews.save, { threadId, search: `panel=${childId}` });
    await alice.mutation(api.threads.remove, { threadId });
    expect(await t.run((ctx) => ctx.db.query("projectViews").collect())).toEqual([]);
  });
});
