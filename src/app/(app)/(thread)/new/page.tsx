import { Suspense } from "react";
import { api } from "@convex/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { NewProjectComposer } from "@/components/project/new-project-composer";

export default async function NewProjectPage() {
  // Fetched on the server so the greeting and starters are there on first paint.
  const preloadedOrg = await preloadAuthQuery(api.organizations.current);

  // The composer reads ?name=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <NewProjectComposer preloadedOrg={preloadedOrg} />
    </Suspense>
  );
}
