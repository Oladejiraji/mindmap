import { redirect } from "next/navigation";
import type { Id } from "@convex/dataModel";
import { routes } from "@/lib/routes";

// Nodes open as a side panel over their project; keep old links working.
export default async function NodePage({
  params,
}: {
  params: Promise<{ threadId: string; nodeId: string }>;
}) {
  const { threadId, nodeId } = await params;
  redirect(routes.node(threadId, nodeId as Id<"nodes">));
}
