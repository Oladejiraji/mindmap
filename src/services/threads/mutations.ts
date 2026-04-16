import { useMutation } from "convex/react";
import { api } from "@convex/api";

export function useCreateThread() {
  return useMutation(api.threads.create);
}

export function useRenameThread() {
  return useMutation(api.threads.rename);
}
