import { useMutation } from "convex/react";
import { api } from "@convex/api";

export function useCreateBranch() {
  return useMutation(api.nodes.createBranch);
}

export function useUpdatePosition() {
  return useMutation(api.nodes.updatePosition);
}

export function useRenameNode() {
  return useMutation(api.nodes.rename);
}

export function useCreateEmptyBranch() {
  return useMutation(api.nodes.createEmptyBranch);
}

export function useDeleteLeafNode() {
  return useMutation(api.nodes.deleteLeafNode);
}

export function useDeleteSubtree() {
  return useMutation(api.nodes.deleteSubtree);
}
