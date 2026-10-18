"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { api } from "@convex/api";
import { closeTab, useRegisterTab } from "@/lib/tabs";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { Spinner } from "@/components/ui/spinner";
import { SendIcon } from "@/components/icons/send-icon";

/*
 * New-tab empty state, modelled on define.app: an empty panel with the
 * composer sitting low and centred. Creating uses existing mutations only: threads.create
 * (which also makes the root node) and, if a question was written,
 * nodes.updateContent on that root node.
 */
export function NewProjectComposer() {
  const router = useRouter();
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

  return (
    <div className="flex h-full flex-col items-center justify-end px-4 pb-[12vh]">
      <div className="w-full max-w-[600px]">
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
              className="w-full bg-transparent text-body-base font-medium text-fg-primary outline-none placeholder:text-placeholder"
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
              {/* Same send disc as the chat composer: grey until there's a name. */}
              <button
                type="button"
                onClick={() => void create()}
                disabled={!canCreate}
                aria-label="Create project"
                title="Create project (⌘↵)"
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-inverted-solid text-on-inverted-fg outline-none transition-colors hover:bg-inverted-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary"
              >
                {creating ? <Spinner className="size-4" /> : <SendIcon className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
