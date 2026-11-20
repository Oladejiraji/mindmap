import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { modules } from "./test.setup";

function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return { t, alice: t.withIdentity({ subject: "alice" }), bob: t.withIdentity({ subject: "bob" }) };
}

const names = (tabs: { thread: { name: string } }[]) => tabs.map((tab) => tab.thread.name);

describe("tabs", () => {
  test("a new project opens as the last tab", async () => {
    const { alice } = setup();
    await alice.mutation(api.threads.create, { name: "First" });
    await alice.mutation(api.threads.create, { name: "Second" });
    expect(names(await alice.query(api.tabs.list, {}))).toEqual(["First", "Second"]);
  });

  test("opening an open project doesn't add another tab or move it", async () => {
    const { alice } = setup();
    const { threadId } = await alice.mutation(api.threads.create, { name: "First" });
    await alice.mutation(api.threads.create, { name: "Second" });
    await alice.mutation(api.tabs.open, { threadId });
    expect(names(await alice.query(api.tabs.list, {}))).toEqual(["First", "Second"]);
  });

  test("closing a tab keeps the project, and reopening puts it at the end", async () => {
    const { alice } = setup();
    const { threadId } = await alice.mutation(api.threads.create, { name: "First" });
    await alice.mutation(api.threads.create, { name: "Second" });

    await alice.mutation(api.tabs.close, { threadId });
    expect(names(await alice.query(api.tabs.list, {}))).toEqual(["Second"]);
    expect(await alice.query(api.threads.list, {})).toHaveLength(2);

    await alice.mutation(api.tabs.open, { threadId });
    expect(names(await alice.query(api.tabs.list, {}))).toEqual(["Second", "First"]);
  });

  test("reorder puts tabs in the given order; ones left out follow", async () => {
    const { alice } = setup();
    const a = await alice.mutation(api.threads.create, { name: "A" });
    const b = await alice.mutation(api.threads.create, { name: "B" });
    await alice.mutation(api.threads.create, { name: "C" });
    await alice.mutation(api.tabs.reorder, { threadIds: [b.threadId, a.threadId] });
    expect(names(await alice.query(api.tabs.list, {}))).toEqual(["B", "A", "C"]);
    // A new tab still lands at the end.
    await alice.mutation(api.threads.create, { name: "D" });
    expect(names(await alice.query(api.tabs.list, {}))).toEqual(["B", "A", "C", "D"]);
  });

  test("pinning moves a tab to the end of the pinned ones; unpinning to the start of the rest", async () => {
    const { alice } = setup();
    await alice.mutation(api.threads.create, { name: "A" });
    const b = await alice.mutation(api.threads.create, { name: "B" });
    const c = await alice.mutation(api.threads.create, { name: "C" });
    await alice.mutation(api.tabs.togglePin, { threadId: c.threadId });
    await alice.mutation(api.tabs.togglePin, { threadId: b.threadId });
    const tabs = await alice.query(api.tabs.list, {});
    expect(names(tabs)).toEqual(["C", "B", "A"]);
    expect(tabs.map((t) => t.pinned)).toEqual([true, true, false]);

    // Unpinning puts it first among the unpinned tabs, next to where it was.
    await alice.mutation(api.tabs.togglePin, { threadId: c.threadId });
    expect(names(await alice.query(api.tabs.list, {}))).toEqual(["B", "C", "A"]);
    expect((await alice.query(api.tabs.list, {})).map((t) => t.pinned)).toEqual([true, false, false]);
  });

  test("deleting a project removes its tab", async () => {
    const { alice } = setup();
    const { threadId } = await alice.mutation(api.threads.create, { name: "First" });
    await alice.mutation(api.threads.remove, { threadId });
    expect(await alice.query(api.tabs.list, {})).toEqual([]);
  });

  test("you can't open someone else's project, and tabs are your own", async () => {
    const { alice, bob } = setup();
    const { threadId } = await alice.mutation(api.threads.create, { name: "Alice's" });
    await expect(bob.mutation(api.tabs.open, { threadId })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    expect(await bob.query(api.tabs.list, {})).toEqual([]);
    // Closing someone else's tab does nothing.
    await bob.mutation(api.tabs.close, { threadId });
    expect(names(await alice.query(api.tabs.list, {}))).toEqual(["Alice's"]);
  });
});
