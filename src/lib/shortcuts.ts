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
    group: "Tabs",
    shortcuts: [
      { combo: ["⌥", "1–8"], label: "Go to tab", hint: "Go to the tab at that position." },
      { combo: ["⌥", "9"], label: "Last tab", hint: "Go to the last tab." },
      { combo: ["⌥", "[", "]"], label: "Previous / next tab", hint: "Move one tab left or right." },
      { combo: ["⌥", "T"], label: "New project", hint: "Open a new project tab." },
      { combo: ["⌥", "W"], label: "Close tab", hint: "Close the tab you're on (not pinned tabs)." },
      { combo: ["⌥", "⇧", "T"], label: "Reopen closed tab", hint: "Bring back the last tab you closed." },
      { combo: ["⌥", "K"], label: "Search tabs", hint: "Find an open tab by name." },
      { combo: ["←", "→"], label: "Move between tabs", hint: "With a tab focused. Home and End jump to the ends." },
      { combo: ["F2"], label: "Rename tab", hint: "With a tab focused, rename its project." },
      { combo: ["Delete"], label: "Close focused tab", hint: "With a tab focused, close it." },
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
