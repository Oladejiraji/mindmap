"use client";

import type { ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { PlusIcon } from "lucide-react";
import { AnthropicIcon, GptIcon } from "@/lib/svg";
import { CheckIcon } from "@/components/icons/check-icon";
import { popupRow, popupSection, popupSurface } from "@/components/layout/sidebar/popover-styles";
import { cn } from "@/lib/utils";

export type ModelId = "gpt-5.5" | "claude-opus-5.5" | "claude-sonnet-5.5" | "claude-haiku-5.5";

// short: the label on the card's chip
export const MODELS: { id: ModelId; name: string; short: string; provider: string; icon: ReactNode }[] = [
  { id: "gpt-5.5", name: "ChatGPT 5.5", short: "ChatGPT 5.5", provider: "OpenAI", icon: <GptIcon /> },
  { id: "claude-opus-5.5", name: "Claude Opus 5.5", short: "Opus 5.5", provider: "Anthropic", icon: <AnthropicIcon /> },
  { id: "claude-sonnet-5.5", name: "Claude Sonnet 5.5", short: "Sonnet 5.5", provider: "Anthropic", icon: <AnthropicIcon /> },
  { id: "claude-haiku-5.5", name: "Claude Haiku 5.5", short: "Haiku 5.5", provider: "Anthropic", icon: <AnthropicIcon /> },
];

/*
 * The "+" beside a card's model chips: a menu of models by name and
 * provider; ticking one adds it to the card's chips, unticking removes it.
 * Portalled so the canvas transform doesn't clip or scale it; nodrag so
 * clicking it doesn't start a node drag.
 */
export function ModelsMenu({
  selected,
  onToggle,
  triggerClassName,
}: {
  selected: ModelId[];
  onToggle: (id: ModelId) => void;
  triggerClassName?: string;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger aria-label="Add a model" className={cn("nodrag nopan cursor-pointer", triggerClassName)}>
        <PlusIcon className="size-3" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup className={cn(popupSurface, "w-72")}>
            <Menu.Group className={popupSection}>
              <Menu.GroupLabel className="px-2.5 pt-1.5 pb-1 text-caption-lg text-fg-tertiary">Models</Menu.GroupLabel>
              {MODELS.map((m) => (
                <Menu.CheckboxItem
                  key={m.id}
                  checked={selected.includes(m.id)}
                  onCheckedChange={() => onToggle(m.id)}
                  closeOnClick={false}
                  className={cn(popupRow, "h-9")}
                >
                  <span className="flex size-4.5 shrink-0 items-center justify-center">{m.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="text-caption-lg text-fg-tertiary">{m.provider}</span>
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <Menu.CheckboxItemIndicator>
                      <CheckIcon className="size-4 text-fg-secondary" />
                    </Menu.CheckboxItemIndicator>
                  </span>
                </Menu.CheckboxItem>
              ))}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
