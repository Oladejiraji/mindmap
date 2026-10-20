import { Suspense } from "react";
import { NewProjectComposer } from "@/components/project/new-project-composer";

export default function NewProjectPage() {
  // The composer reads ?name=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <NewProjectComposer />
    </Suspense>
  );
}
