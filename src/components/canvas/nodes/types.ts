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
  [key: string]: unknown;
}

export const CANVAS_NODE_WIDTH = 360;
