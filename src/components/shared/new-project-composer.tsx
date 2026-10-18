"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/api";
import { closeTab, useRegisterTab } from "@/lib/tabs";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { useSendMessage } from "@/services/chat/actions";
import { ChatInput } from "@/components/chat/chat-input";

/*
 * New-tab empty state: a chat, ChatGPT-style. There is no project form —
 * the first message starts the project. Sending creates the thread (and
 * its root node) via threads.create, sends the message to the root node
 * via chat.sendMessage, and lands in the project's chat view, where
 * branches become nodes. The composer sits where the chat view's does,
 * so the switch is seamless.
 */

// Until the backend names projects, take the opening words of the message.
function nameFrom(message: string) {
  const line = message.replace(/\s+/g, " ").trim();
  if (line.length <= 60) return line;
  const cut = line.slice(0, 60);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 30 ? cut.lastIndexOf(" ") : 60)}…`;
}

export function NewProjectComposer() {
  const router = useRouter();
  const createThread = useMutation(api.threads.create);
  const sendMessage = useSendMessage();
  const [starting, setStarting] = useState(false);
  // The + menu can hand over text typed into its search (?name=).
  const initial = useSearchParams().get("name") ?? "";

  useRegisterTab({ href: routes.newProject, kind: "new", title: "New project" });

  const start = async (content: string) => {
    setStarting(true);
    try {
      const { threadId, rootNodeId } = await createThread({ name: nameFrom(content) });
      closeTab(routes.newProject, routes.newProject);
      router.replace(`${routes.thread(threadId)}?view=chat&node=${rootNodeId}`);
      // The reply streams into the chat view; this tab's page is gone by then.
      sendMessage({ nodeId: rootNodeId, content }).catch((err) => handleError(err, "Failed to send message"));
    } catch (err) {
      handleError(err, "Failed to start chat");
      setStarting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-heading-5 font-semibold text-fg-primary">What are you trying to figure out?</h1>
        <p className="mt-2 max-w-md text-body-sm text-fg-secondary">
          Start with a question. Branch the conversation as it grows; every branch becomes a node you can trace on the canvas.
        </p>
      </div>
      <div className="shrink-0 px-6 pb-6">
        <div className="mx-auto w-full max-w-[720px]">
          <ChatInput
            key={initial}
            defaultValue={initial}
            onSend={(content) => void start(content)}
            disabled={starting}
            placeholder="Ask anything…"
          />
        </div>
      </div>
    </div>
  );
}
