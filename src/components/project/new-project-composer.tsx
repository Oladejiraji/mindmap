"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { authClient } from "@/lib/auth-client";
import { ChatInput } from "@/components/chat/chat-input";
import { LogoIcon } from "@/components/icons/sidebar-toggle";

/*
 * New-tab empty state: a chat, ChatGPT-style. There is no project form —
 * the first message starts the project. Sending creates the thread (and
 * its root node) via threads.create, sends the message to the root node
 * via chat.send, and lands on the canvas with the root's side panel
 * open on its chat. The reply streams in there and suggests the root's
 * first document, which is the core loop: ask, accept, and the node grows.
 *
 * Layout: the heading and a large composer, centred together. Nothing streams here, so the composer isn't docked at
 * the bottom the way it is in a conversation.
 */

export function NewProjectComposer() {
  const router = useRouter();
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.chat.send);
  // If the project was made but the message didn't send, the next try
  // sends into that project rather than making another.
  const created = useRef<{ threadId: Id<"threads">; rootNodeId: Id<"nodes"> } | null>(null);
  // The + menu can hand over text typed into its search (?name=).
  const initial = useSearchParams().get("name") ?? "";
  // Sent: the box waits, busy, until the canvas opens.
  const [leaving, setLeaving] = useState(false);

  const { data: session } = authClient.useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];

  // Rejecting keeps the text in the box for another try.
  const start = async (content: string) => {
    try {
      created.current ??= await createThread({});
      const { threadId, rootNodeId } = created.current;
      await sendMessage({ nodeId: rootNodeId, content });
      setLeaving(true);
      // Land on the canvas with the root's panel open on its chat: the reply
      // streams in there, and its suggested first document shows under it.
      router.replace(`${routes.node(threadId, rootNodeId)}&tab=chat`);
    } catch (err) {
      handleError(err, "Failed to start chat");
      throw err;
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 pb-[12vh]">
      <div className="flex w-full max-w-[720px] flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          {/* The app mark, as in the sidebar */}
          <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-brand-solid text-on-brand-solid">
            <LogoIcon className="h-auto w-5" />
          </span>
          <h1 className="text-center text-heading-6 font-medium text-balance text-fg-primary">
            {firstName ? `What are you trying to figure out, ${firstName}?` : "What are you trying to figure out?"}
          </h1>
        </div>
        <ChatInput
          key={initial}
          defaultValue={initial}
          onSend={start}
          busy={leaving}
          size="large"
          placeholder="Describe a question, a problem or an idea…"
        />
      </div>
    </div>
  );
}
