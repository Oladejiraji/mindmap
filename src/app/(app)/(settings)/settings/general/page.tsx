import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

// General became Administration › Workspace.
export default function GeneralSettingsPage() {
  redirect(routes.settingsWorkspace);
}
