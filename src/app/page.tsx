"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/shared/chat/chat-input";
import { useCreateThread } from "@/services/threads/mutations";
import { useSendMessage } from "@/services/chat/actions";

export default function Home() {
  const router = useRouter();
  const createThread = useCreateThread();
  const sendMessage = useSendMessage();
  const [isStarting, setIsStarting] = useState(false);

  const handleSend = async (content: string) => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const { threadId, rootNodeId } = await createThread({ name: "Untitled" });
      // Fire-and-forget so navigation isn't blocked on the LLM stream
      void sendMessage({ nodeId: rootNodeId, content });
      router.push(`/t/${threadId}/n/${rootNodeId}`);
    } catch (err) {
      setIsStarting(false);
      throw err;
    }
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center justify-center">
      <div className="flex w-full max-w-175 flex-col items-center gap-8 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">What do you want to explore?</h1>
          <p className="text-sm text-muted-foreground">
            Start a conversation. Branch off whenever a tangent deserves its
            own space.
          </p>
        </div>
        <div className="w-full">
          <ChatInput onSend={handleSend} disabled={isStarting} />
        </div>
      </div>
    </div>
  );
}
