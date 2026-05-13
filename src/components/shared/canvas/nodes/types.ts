export interface MindMapNodeData {
  title: string;
  isRoot: boolean;
  isParent: boolean;
  content?: string;
  onDelete?: (nodeId: string) => void;
  onRename?: (nodeId: string, title: string) => void;
  [key: string]: unknown;
}

export const CANVAS_NODE_WIDTH = 360;
