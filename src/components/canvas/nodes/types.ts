import type { PreviewBlock } from "./node-preview";

export interface MindMapNodeData {
  title: string;
  isRoot: boolean;
  isParent: boolean;
  /** Markdown. */
  content?: string;
  /** Opens the node in the side panel. */
  onOpen?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onRename?: (nodeId: string, title: string) => void;
  /** A suggested edit to this node is waiting for an answer. */
  hasSuggestion?: boolean;
  /** Shows the node as it would be after that edit, in place of its content. */
  preview?: PreviewBlock[];
  [key: string]: unknown;
}

export const CANVAS_NODE_WIDTH = 360;
