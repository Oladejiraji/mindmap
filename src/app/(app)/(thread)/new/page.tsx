import { Suspense } from "react";
import { NewProjectComposer } from "@/components/project/new-project-composer";

// Fetches nothing: the greeting and starters come from the layout, so the
// page is quick to render and can be prefetched whole.
export default function NewProjectPage() {
  // The composer reads ?name=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <NewProjectComposer />
    </Suspense>
  );
}
