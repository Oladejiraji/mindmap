export type Shortcut = {
  combo: string[];
  label: string;
  hint: string;
};

export type ShortcutGroup = {
  group: string;
  shortcuts: Shortcut[];
};

export const SHORTCUTS: ShortcutGroup[] = [
  {
    group: "App",
    shortcuts: [
      {
        combo: ["⌘", "B"],
        label: "Sidebar",
        hint: "Show or hide the sidebar.",
      },
    ],
  },
  {
    group: "Canvas",
    shortcuts: [
      {
        combo: ["Tab"],
        label: "Add branch",
        hint: "Add a branch to the selected node (or the root).",
      },
      {
        combo: ["↵"],
        label: "Add sibling",
        hint: "Add a sibling next to the selected node.",
      },
      {
        combo: ["+", "−"],
        label: "Zoom",
        hint: "Zoom in or out, or pinch and ⌘-scroll.",
      },
      {
        combo: ["?"],
        label: "Shortcuts",
        hint: "Show or hide the canvas shortcut list.",
      },
      {
        combo: ["Esc"],
        label: "Close panel",
        hint: "Close the node side panel.",
      },
    ],
  },
  {
    group: "Chat",
    shortcuts: [
      { combo: ["↵"], label: "Send", hint: "Send the message." },
      {
        combo: ["⇧", "↵"],
        label: "New line",
        hint: "Start a new line without sending.",
      },
    ],
  },
  {
    group: "Search",
    shortcuts: [
      {
        combo: ["↑", "↓"],
        label: "Move",
        hint: "Move through results.",
      },
      {
        combo: ["↵"],
        label: "Open",
        hint: "Open the highlighted result.",
      },
    ],
  },
];

export function getShortcutGroup(group: string): Shortcut[] {
  return SHORTCUTS.find((g) => g.group === group)?.shortcuts ?? [];
}
