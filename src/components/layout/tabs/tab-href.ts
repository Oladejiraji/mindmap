import { routes } from "@/lib/routes";

/** Where a tab links: the project, back where you last were in it. */
export function tabHref(tab: { thread: { _id: string }; search: string }) {
  const path = routes.thread(tab.thread._id);
  return tab.search ? `${path}?${tab.search}` : path;
}
