import { Extension } from "@tiptap/core";

/*
 * Chat keys for the composer: Enter sends, Shift+Enter breaks the line.
 * Inside a list or a code block, Enter keeps its editing meaning (a new
 * item, a new line), the way Slack does it; Cmd/Ctrl+Enter sends from
 * anywhere. Runs ahead of StarterKit's own Enter handling.
 */
export const SubmitOnEnter = Extension.create<{ onSubmit: () => void }>({
  name: "submitOnEnter",
  priority: 1000,

  addOptions() {
    return { onSubmit: () => {} };
  },

  addKeyboardShortcuts() {
    const submit = () => {
      this.options.onSubmit();
      return true;
    };
    return {
      Enter: ({ editor }) => (editor.isActive("codeBlock") || editor.isActive("listItem") ? false : submit()),
      "Mod-Enter": submit,
    };
  },
});
