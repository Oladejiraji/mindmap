"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { GradientAvatar } from "@outpacelabs/avatars";
import { Trash2 } from "lucide-react";
import { api } from "@convex/api";
import { authClient } from "@/lib/auth-client";
import { closeTab, useRegisterTab } from "@/lib/tabs";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";

/*
 * New-tab empty state, modelled on define.app: an empty panel with the
 * composer sitting low and centred, under a pill showing who you're
 * creating as. Creating uses existing mutations only: threads.create
 * (which also makes the root node) and, if a question was written,
 * nodes.updateContent on that root node.
 */
export function NewProjectComposer() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const createThread = useMutation(api.threads.create);
  const updateContent = useMutation(api.nodes.updateContent);
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useRegisterTab({ href: routes.newProject, kind: "new", title: "New project" });

  const canCreate = name.trim().length > 0 && !creating;

  const create = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const { threadId, rootNodeId } = await createThread({ name: name.trim() });
      const text = question.trim();
      if (text) {
        await updateContent({
          nodeId: rootNodeId,
          content: [
            {
              id: crypto.randomUUID(),
              type: "paragraph",
              props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
              content: [{ type: "text", text, styles: {} }],
              children: [],
            },
          ],
        });
      }
      closeTab(routes.newProject, routes.newProject);
      router.replace(routes.thread(threadId));
    } catch (err) {
      handleError(err, "Failed to create project");
      setCreating(false);
    }
  };

  const discard = () => {
    const next = closeTab(routes.newProject, routes.newProject);
    router.push(next ?? routes.home);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void create();
    }
  };

  const userName = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";

  return (
    <div className="flex h-full flex-col items-center justify-end bg-background px-4 pb-[12vh]">
      <div className="w-full max-w-[600px]">
        {session && (
          <div className="mb-3 inline-flex h-11 items-center gap-2 rounded-full bg-surface-container px-3 shadow-large">
            <span className="flex size-6 shrink-0 overflow-hidden rounded-full outline-[0.5px] outline-offset-[-0.5px] outline-border-default">
              <GradientAvatar seed={email || userName} size={24} />
            </span>
            <span className="text-body-sm font-medium text-fg-primary">{userName}</span>
            <span className="text-body-sm text-fg-tertiary">{email}</span>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl bg-surface-container shadow-large" onKeyDown={onKeyDown}>
          <div className="px-6 pt-5 pb-3">
            <input
              ref={nameRef}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  document.getElementById("new-project-question")?.focus();
                }
              }}
              placeholder="Project name"
              aria-label="Project name"
              className="w-full bg-transparent text-body-lg font-medium text-fg-primary outline-none placeholder:text-placeholder"
            />
          </div>
          <div className="border-t border-border-subtle px-6 pt-4 pb-2">
            <textarea
              id="new-project-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="What are you trying to figure out? This becomes the root node."
              aria-label="Root question"
              className="field-sizing-content max-h-60 min-h-18 w-full resize-none bg-transparent text-body-base text-fg-primary outline-none placeholder:text-placeholder"
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-4">
            <button
              type="button"
              onClick={discard}
              aria-label="Discard"
              title="Discard"
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Trash2 className="size-4" />
            </button>
            <div className="flex items-center gap-3">
              <span className="hidden text-caption-lg text-fg-tertiary sm:inline">⌘↵ to create</span>
              <Button onClick={() => void create()} disabled={!canCreate} isLoading={creating}>
                Create project
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
