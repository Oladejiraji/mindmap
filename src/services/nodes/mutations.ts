import { useMutation } from "convex/react";
import { api } from "@convex/api";

export function useCreateBranch() {
  return useMutation(api.nodes.createBranch);
}

export function useUpdatePosition() {
  return useMutation(api.nodes.updatePosition);
}
